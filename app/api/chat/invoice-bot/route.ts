import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";
import { createInvoice, getNextInvoiceNumber } from "@/lib/invoice";
import { generateInvoicePdf } from "@/lib/invoicePdf";
import { getCompanyConfig, getBankDetails } from "@/lib/invoice";
import type { InvoiceItem } from "@/lib/database";

interface ChatState {
  step: "askProjectCode" | "confirmClient" | "askItems" | "askPeriod" | "askPayment" | "confirmInvoice" | "awaitEmail" | "done";
  projectCode?: string;
  suggestedCode?: string;
  client?: {
    client_name: string;
    company_name: string;
    address: string;
    client_email: string;
  };
  items?: InvoiceItem[];
  period?: string;
  paymentCharges?: number;
  lastInvoiceId?: number;
}

// In-memory session store (fine for prototype; move to Redis in prod)
const sessions = new Map<string, ChatState>();

// Simple Levenshtein distance for fuzzy suggestions
function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[a.length][b.length];
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, message: rawMessage } = await req.json();
    let inputMsg: string = (rawMessage || '').trim();
    if (!sessionId || !rawMessage) {
      return NextResponse.json({ error: "Missing sessionId or message" }, { status: 400 });
    }

    // Retrieve or init session
    let state = sessions.get(sessionId);
    if (!state) {
      state = { step: "askProjectCode" };
      sessions.set(sessionId, state);
    }

    let userMsg = inputMsg;

    switch (state.step) {
      case "askProjectCode": {
        // If user provides email here and we have last invoice, send it
        const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
        if (emailRegex.test(userMsg) && state.lastInvoiceId) {
          try {
            await fetch(`${req.nextUrl.origin}/api/invoices/${state.lastInvoiceId}/email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: userMsg })
            });
            state.step = "done";
            return NextResponse.json({ reply: "Email sent! Anything else I can help with?" });
          } catch (e) {
            console.error(e);
            return NextResponse.json({ reply: "Sorry, I couldn't send the email right now. Please try again later." });
          }
        }
        // If suggestion pending and user confirms
        if (state.suggestedCode && /^y(es)?$/i.test(userMsg)) {
          // Treat suggestedCode as input
          inputMsg = state.suggestedCode;
          userMsg = state.suggestedCode;
          state.suggestedCode = undefined;
        }
        if (/^(hi|hello|hey)\b/i.test(userMsg)) {
          return NextResponse.json({ reply: "Hi! Please provide the project code to start generating the invoice." });
        }
        // Validate code
        const [rows] = await pool.query(
          "SELECT project_code, company_name, address, client_name, client_email FROM projects_details WHERE UPPER(project_code)=? LIMIT 1",
          [userMsg.toUpperCase()]
        );
        if (Array.isArray(rows) && rows.length) {
          const row: any = rows[0];
          state.projectCode = row.project_code;
          state.client = {
            client_name: row.client_name,
            company_name: row.company_name,
            address: row.address,
            client_email: row.client_email,
          };
          state.step = "confirmClient";
          return NextResponse.json({
            reply: `Found project ${row.project_code} for client ${row.client_name} (${row.company_name}).\nIs this correct? (yes/no)`,
          });
        }
        // Attempt fuzzy suggestion
        const [allRows] = await pool.query('SELECT project_code FROM projects_details');
        const inputCode = userMsg.toUpperCase();
        let closest: string | null = null;
        let minDist = 5; // suggest if reasonably close
        for (const r of allRows as any[]) {
          const code: string = (r as any).project_code.toUpperCase();
          const dist = levenshtein(inputCode, code);
          if (dist < minDist) {
            minDist = dist;
            closest = code;
          }
        }
        if (closest && minDist <= 4) {
          state.suggestedCode = closest;
          return NextResponse.json({ reply: `I couldn't find that code. Did you mean ${closest}?` });
        }
        return NextResponse.json({ reply: "Sorry, I couldn't find that project code. Please try again." });
      }

      case "confirmClient": {
        if (/^y(es)?$/i.test(userMsg)) {
          state.step = "askItems";
          return NextResponse.json({
            reply: `Great! Please send the billing period followed by all items in one message using the format:\n<period> ( description , qty , rate | description , qty , rate )\nExample: Apr 2025 (Consulting,10,100 | Support,5,50)`,
          });
        }
        // If no, restart
        state.step = "askProjectCode";
        return NextResponse.json({ reply: "Okay, please provide the correct project code." });
      }

      case "askItems": {
        // Parse period + items in one message
        // Detect pattern Period (items)
        let periodExtracted: string | undefined;
        let itemsPart = userMsg;
        const parenMatch = userMsg.match(/^(.*?)\((.*)\)$/s);
        if (parenMatch) {
          periodExtracted = parenMatch[1].trim();
          itemsPart = parenMatch[2].replace(/\)$/,'').trim();
          if (periodExtracted) state.period = periodExtracted;
        }
        const rawLines = itemsPart.split(/\||\n/).filter((l) => l.trim().length);
        const candidateLines = rawLines.length ? rawLines : [userMsg];
        const items: InvoiceItem[] = [];
        for (const line of candidateLines) {
          const tokens = line.split(/[;,|]/).map((t) => t.trim()).filter(Boolean);
          if (tokens.length < 3) continue;
          const desc = tokens[0];
          const qty = parseFloat(tokens[1]);
          let rate = parseFloat(tokens[2]);
          let periodStr: string | undefined;
          if (isNaN(rate) && tokens.length >=4) {
            // assume order desc, qty, period, rate
            periodStr = tokens[2];
            rate = parseFloat(tokens[3]);
          } else if (tokens.length ===4) {
            periodStr = tokens[3];
          }
          if (periodStr && !state.period) state.period = periodStr;
          if (isNaN(qty) || isNaN(rate)) continue;
          items.push({
            id: 0,
            invoice_id: 0,
            description: desc,
            base_rate: rate,
            unit: qty,
            amount: qty * rate,
          });
        }
        if (!items.length) {
          return NextResponse.json({ reply: "Couldn't parse items. Please provide lines like Development phase 1,2,100 (description, qty, rate)." });
        }
        state.items = items;
        const subtotal = items.reduce((s, it) => s + it.amount, 0);
        if (!state.period) {
          state.step = "askPeriod";
          return NextResponse.json({ reply: `Subtotal is ${subtotal.toFixed(2)}. What is the billing period for this invoice?` });
        }
        state.step = "askPayment";
        return NextResponse.json({ reply: `Subtotal is ${subtotal.toFixed(2)} for period ${state.period}. Add payment transfer charges of $35? (yes/no)` });
      }

      case "askPeriod": {
        if (!userMsg.trim()) {
          return NextResponse.json({ reply: "Please provide a period." });
        }
        state.period = userMsg.trim();
        state.step = "askPayment";
        const subtotal = state.items!.reduce((s, it) => s + it.amount, 0);
        return NextResponse.json({ reply: `Subtotal is ${subtotal.toFixed(2)} for period ${state.period}. Add payment transfer charges of $35? (yes/no)` });
      }

      case "askPayment": {
        const yes = /^y(es)?$/i.test(userMsg);
        state.paymentCharges = yes ? 35 : 0;
        state.step = "confirmInvoice";
        const subtotal = state.items!.reduce((s, it) => s + it.amount, 0);
        return NextResponse.json({ reply: `Total is ${subtotal.toFixed(2)}. Shall I generate the invoice? (yes/no)` });
      }


      case "confirmInvoice": {
        if (!/^y(es)?$/i.test(userMsg)) {
          state.step = "askItems";
          return NextResponse.json({ reply: "Okay, please re-enter the items." });
        }

        // Create invoice
        if (!state.client || !state.items) {
          return NextResponse.json({ reply: "Session error. Let's start over." });
        }

        const invoiceNumber = await getNextInvoiceNumber();
        const subtotal = state.items.reduce((s, it) => s + it.amount, 0);
        const payment_charges = state.paymentCharges ?? 0;
        const total = subtotal + payment_charges;

        const now = new Date();
        const invoiceId = await createInvoice(
          {
            invoice_number: invoiceNumber,
            user_id: 1, // TODO: dynamic user
            client_name: state.client.client_name,
            client_company_name: state.client.company_name,
            client_address: state.client.address,
            client_email: state.client.client_email,
            invoice_date: new Date().toISOString().split("T")[0],
            period: state.period || "",
            term: "On receipt",
            project_code: state.projectCode || "",
            subtotal,
            payment_charges,
            total,
            status: "sent",
          },
          state.items
        );

        // Generate PDF
        const company = await getCompanyConfig();
        const bank = await getBankDetails();
        const pdfFileName = `invoice-${invoiceNumber}.pdf`;
        await generateInvoicePdf(
          {
            id: invoiceId,
            invoice_number: invoiceNumber,
            user_id: 1,
            client_name: state.client.client_name,
            client_company_name: state.client.company_name,
            client_address: state.client.address,
            client_email: state.client.client_email,
            invoice_date: new Date().toISOString().split("T")[0],
            period: state.period || "",
            term: "On receipt",
            project_code: state.projectCode || "",
            subtotal,
            payment_charges,
            total,
            status: "sent",
            items: state.items,
          } as any,
          company,
          bank,
          pdfFileName
        );

        // We will email after user provides address
        // Schedule next month's reminder
        const nextRun = new Date();
        nextRun.setMonth(nextRun.getMonth() + 1);
        await pool.query('INSERT INTO recurring_invoices (invoice_id, next_run) VALUES (?, ?)', [invoiceId, nextRun.toISOString().split('T')[0]]);

        state.lastInvoiceId = invoiceId;
        state.step = "awaitEmail";
        return NextResponse.json({
          reply: `Invoice #${invoiceNumber} generated! You can download it now. Please provide an email address if you'd like me to send it as an attachment, or type 'skip'.`,
          actions: { downloadUrl: `/api/invoices/${invoiceId}/pdf`, invoiceId, askEmail: true }
        });
      }

      case "awaitEmail": {
        if (/^skip$/i.test(userMsg)) {
          state.step = "done";
          return NextResponse.json({ reply: "Okay, done! If you need anything else just let me know." });
        }
        const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
        if (!emailRegex.test(userMsg)) {
          return NextResponse.json({ reply: "That doesn't look like a valid email. Please enter a valid email address or type 'skip'." });
        }
        const invoiceId = state.lastInvoiceId ?? 0;
        try {
          await fetch(`${req.nextUrl.origin}/api/invoices/${invoiceId}/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userMsg })
          });
        } catch (e) {
          console.error(e);
          return NextResponse.json({ reply: "Failed to send email. You can try again or type 'skip'." });
        }
        state.step = "done";
        return NextResponse.json({ reply: "Email sent! Anything else I can help with?" });
      }

      case "done": {
        if (/didn'?t\s+get\s+email|no\s+email/i.test(userMsg) && state.lastInvoiceId) {
          try {
            await fetch(`${req.nextUrl.origin}/api/invoices/${state.lastInvoiceId}/email`, { method: 'POST' });
            return NextResponse.json({ reply: "I've re-sent the email. Please check your inbox (and spam folder). Anything else?" });
          } catch (e) {
            console.error(e);
            return NextResponse.json({ reply: "Sorry, I couldn't resend the email right now. Please try again later or contact support." });
          }
        }

        // Reset session for new invoice
        sessions.set(sessionId, { step: "askProjectCode" });
        return NextResponse.json({ reply: "Sure! Please provide the project code for the new invoice." });
      }

      default:
        return NextResponse.json({ reply: "Sorry, I didn't get that." });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ reply: "Internal server error" }, { status: 500 });
  }
}
