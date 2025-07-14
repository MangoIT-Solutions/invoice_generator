import fs from "fs/promises";
import path from "path";
import { google } from "googleapis";
import { simpleParser } from "mailparser";
import { createMimeMessage } from "mimetext";
import { getRefreshToken, getAutomateUser, client } from "@/lib/database";
import { generateInvoiceHtmlBody } from "@/lib/utils";

export async function sendInvoiceToApi(invoicePayload: any) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(invoicePayload),
  });
  console.log("Sending invoice to API:", invoicePayload);
  const data = await res.json();
  return { status: res.status, data };
}

export async function sendInvoiceByGmail(
  to: string,
  subject: string,
  text: string,
  pdfPath: string
) {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) throw new Error("Missing refresh token");

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.GOOGLE_REDIRECT_URI!
    );

    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const pdfBuffer = await fs.readFile(pdfPath);
    const htmlBody = generateInvoiceHtmlBody();

    const message = createMimeMessage();
    message.setSender("me");
    message.setRecipient(to);
    message.setSubject(subject);

    message.addMessage({ contentType: "text/plain", data: text });
    message.addMessage({ contentType: "text/html", data: htmlBody });
    message.addAttachment({
      filename: path.basename(pdfPath),
      contentType: "application/pdf",
      data: pdfBuffer.toString("base64"),
      encoding: "base64",
    });

    const encodedMessage = Buffer.from(message.asRaw())
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage },
    });

    return res;
  } catch (error) {
    console.error("❌ Failed to send invoice email:", error);
    throw error; // rethrow to handle upstream
  }
}

export async function parseEmailsFromGmail() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token in DB");
  console.log("refreshToken:", refreshToken);

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const accessToken = await oauth2Client.getAccessToken();
  console.log("Access Token:", accessToken);
  if (!accessToken) {
    throw new Error("Failed to get access token");
  }

  const label = process.env.GMAIL_QUERY_LABEL || "invoices";
  const subjectCreate = process.env.GMAIL_QUERY_SUBJECT || "Invoice Request";
  const subjectUpdate = process.env.GMAIL_UPDATE_SUBJECT || "Invoice Update";

  if (!label || !subjectCreate || !subjectUpdate) {
    throw new Error(
      "GMAIL_QUERY_LABEL, GMAIL_QUERY_SUBJECT, and GMAIL_UPDATE_SUBJECT must be set"
    );
  }

  let response;
  try {
    response = await gmail.users.messages.list({
      userId: "me",
      q: `label:${label} is:unread`,
      maxResults: 5,
    });
  } catch (err) {
    console.error("Gmail API error:", err);
    throw new Error("Failed to fetch emails from Gmail");
  }

  const messages = response.data.messages || [];
  const parsedInvoices = [];
  const userId = await getAutomateUser();
  console.log("Automate User ID:", userId);

  for (const message of messages) {
    if (!message.id) continue;

    const rawMsg = await gmail.users.messages.get({
      userId: "me",
      id: message.id,
      format: "raw",
    });

    try {
      const parsedEmail = await simpleParser(
        Buffer.from(rawMsg.data.raw!, "base64")
      );
      const subject = parsedEmail.subject || "";

      if (subject.includes("Update")) {
        const invoicePayload = await parseEmailContentForUpdating(
          rawMsg.data.raw!,
          userId
        );
        parsedInvoices.push({
          id: message.id,
          payload: invoicePayload,
          type: "update",
        });
      } else {
        const invoicePayload = await parseEmailContentForCreating(
          rawMsg.data.raw!,
          userId
        );
        parsedInvoices.push({
          id: message.id,
          payload: invoicePayload,
          type: "create",
        });
      }
    } catch (error) {
      console.warn(
        `Skipping invalid invoice in message ${message.id}:`,
        (error as Error).message
      );
    }
  }

  return { gmail, parsedInvoices, accessToken };
}

export async function parseEmailContentForCreating(
  rawBase64Data: string,
  userId: number
) {
  const { senderEmail, bodyText } = await extractSenderAndBody(rawBase64Data);

  if (!bodyText || !senderEmail) {
    throw new Error("No body text or Email found in email");
  }

  const lines = bodyText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const payload: any = {
    user_id: userId,
    client_name: "",
    client_address: "",
    client_email: "",
    invoice_date: new Date().toISOString().split("T")[0],
    Date_range: "",
    term: "",
    project_code: "",
    payment_charges: 0,
    items: [],
    senderEmail: senderEmail,
  };

  const getValue = (str: string, fieldName: string = "Unknown"): string => {
    const parts = str.split(":");
    if (parts.length < 2) {
      throw new Error(`Missing ':' separator for ${fieldName}`);
    }
    const value = parts.slice(1).join(":").trim();
    if (!value) {
      throw new Error(`Empty value for required field: ${fieldName}`);
    }
    return value;
  };

  let isItemSection = false;

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.startsWith("client name:")) {
      payload.client_name = getValue(line, "Client Name");
    } else if (lower.startsWith("client address:")) {
      payload.client_address = getValue(line, "Client Address");
    } else if (lower.startsWith("client email:")) {
      payload.client_email = getValue(line, "Client Email");
    } else if (lower.startsWith("invoice date:")) {
      payload.invoice_date = getValue(line, "Invoice Date");
    } else if (lower.startsWith("project code:")) {
      payload.project_code = getValue(line, "Project Code");
    } else if (lower.startsWith("term:")) {
      payload.term = getValue(line, "Term");
    } else if (lower.startsWith("date range:")) {
      payload.Date_range = getValue(line, "Date Range");
    } else if (lower.startsWith("include transfer charges:")) {
      const val = getValue(line, "Include Transfer Charges").toLowerCase();
      if (val === "yes") payload.payment_charges = 35;
    } else if (lower.startsWith("items:")) {
      isItemSection = true;
    } else if (isItemSection && lower.startsWith("- description:")) {
      const descMatch = line.match(/description:\s*(.*?),/i);
      const rateMatch = line.match(/base rate:\s*([\d.]+)/i);
      const unitMatch = line.match(/unit:\s*([\d.]+)/i);
      const amountMatch = line.match(/amount:\s*([\d.]+)/i);

      if (descMatch && rateMatch && unitMatch && amountMatch) {
        const description = descMatch[1].trim();
        const base_rate = parseFloat(rateMatch[1]);
        const unit = parseFloat(unitMatch[1]);
        const amount = parseFloat(amountMatch[1]);

        if (
          description &&
          !isNaN(base_rate) &&
          !isNaN(unit) &&
          !isNaN(amount)
        ) {
          payload.items.push({ description, base_rate, unit, amount });
        } else {
          throw new Error(`Invalid item values in line: ${line}`);
        }
      } else {
        throw new Error(`Invalid item format in line: ${line}`);
      }
    }
  }

  if (!payload.items.length) {
    throw new Error("Invoice must contain at least one valid item");
  }

  payload.subtotal = payload.items.reduce(
    (sum: number, item: any) => sum + item.amount,
    0
  );
  payload.total = payload.subtotal + (payload.payment_charges || 0);
  payload.status = "draft";

  return payload;
}


export async function extractSenderAndBody(rawBase64: string): Promise<{
  senderEmail: string;
  bodyText: string;
}> {
  const parsed = await simpleParser(Buffer.from(rawBase64, "base64"));
  const senderEmail = parsed.from?.text || "";
  const bodyText = parsed.text || "";

  return { senderEmail, bodyText };
}

export async function parseEmailContentForUpdating(
  rawBase64Data: string,
  userId: number
) {
  const { senderEmail, bodyText } = await extractSenderAndBody(rawBase64Data);

  if (!bodyText || !senderEmail) {
    throw new Error("No body text or Email found in email");
  }

  const lines = bodyText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const payload: any = {
    invoice_number: "", // Required for identifying invoice
    user_id: userId,
    client_name: "",
    client_address: "",
    client_email: "",
    invoice_date: new Date().toISOString().split("T")[0],
    Date_range: "",
    term: "",
    project_code: "",
    payment_charges: undefined,
    items: {
      add: [],
      remove: [],
      replace: [],
    },
    senderEmail,
  };

  
  const getValue = (str: string, fieldName = "Unknown") => {
    const parts = str.split(":");
    if (parts.length < 2) throw new Error(`Missing ':' for ${fieldName}`);
    const value = parts.slice(1).join(":").trim();
    if (!value) throw new Error(`Empty value for ${fieldName}`);
    return value;
  };

  let isItemSection = false;

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.startsWith("invoice number:")) {
      payload.invoice_number = getValue(line, "Invoice Number");
    } else if (lower.startsWith("client name:")) {
      payload.client_name = getValue(line, "Client Name");
    } else if (lower.startsWith("client address:")) {
      payload.client_address = getValue(line, "Client Address");
    } else if (lower.startsWith("client email:")) {
      payload.client_email = getValue(line, "Client Email");
    } else if (lower.startsWith("invoice date:")) {
      payload.invoice_date = getValue(line, "Invoice Date");
    } else if (lower.startsWith("project code:")) {
      payload.project_code = getValue(line, "Project Code");
    } else if (lower.startsWith("term:")) {
      payload.term = getValue(line, "Term");
    } else if (lower.startsWith("date range:")) {
      payload.Date_range = getValue(line, "Date Range");
    } else if (lower.startsWith("include transfer charges:")) {
      const val = getValue(line, "Include Transfer Charges").toLowerCase();
      if (val === "yes") payload.payment_charges = 35;
      else if (val === "no") payload.payment_charges = 0;
    } else if (lower.startsWith("items:")) {
      isItemSection = true;
    } else if (isItemSection && lower.startsWith("- action:")) {
      const actionMatch = line.match(/action:\s*(add|remove|replace)/i);
      const descMatch = line.match(/description:\s*([^,]+)/i);
      const rateMatch = line.match(/base rate:\s*([\d.]+)/i);
      const unitMatch = line.match(/unit:\s*([\d.]+)/i);
      const amountMatch = line.match(/amount:\s*([\d.]+)/i);

      const action = actionMatch?.[1]?.toLowerCase();
      const description = descMatch?.[1]?.trim();

      if (!action || !description) {
        throw new Error(`Invalid item action or description in line: ${line}`);
      }

      if (action === "remove") {
        payload.items.remove.push(description);
      } else {
        if (
          !rateMatch ||
          !unitMatch ||
          !amountMatch ||
          isNaN(parseFloat(rateMatch[1])) ||
          isNaN(parseFloat(unitMatch[1])) ||
          isNaN(parseFloat(amountMatch[1]))
        ) {
          throw new Error(`Invalid or missing fields in line: ${line}`);
        }

        const item = {
          description,
          base_rate: parseFloat(rateMatch[1]),
          unit: parseFloat(unitMatch[1]),
          amount: parseFloat(amountMatch[1]),
        };

        if (action === "add") {
          payload.items.add.push(item);
        } else if (action === "replace") {
          payload.items.replace.push(item);
        }
      }
    }
  }

  if (!payload.invoice_number) {
    throw new Error("Missing Invoice Number for update");
  }

  return payload;
}


export async function updateInvoiceFromPayload(payload) {
  const {
    invoice_number,
    client_name,
    client_address,
    client_email,
    invoice_date,
    Date_range,
    term,
    project_code,
    payment_charges,
    items,
  } = payload;

  if (!invoice_number) throw new Error("Invoice number is required");

  // Step 1: Fetch invoice
  const { rows: invoiceRows } = await client.execute({
    sql: "SELECT id, payment_charges FROM invoices WHERE invoice_number = ?",
    args: [invoice_number],
  });

  if (!invoiceRows.length) throw new Error("Invoice not found");

  const invoice = invoiceRows[0];
  const invoiceId = invoice.id;

  // Step 2: Update invoice fields
  const fields = [];
  const values = [];

  if (client_name) {
    fields.push("client_name = ?");
    values.push(client_name);
  }
  if (client_address) {
    fields.push("client_address = ?");
    values.push(client_address);
  }
  if (client_email) {
    fields.push("client_email = ?");
    values.push(client_email);
  }
  if (invoice_date) {
    fields.push("invoice_date = ?");
    values.push(invoice_date);
  }
  if (Date_range) {
    fields.push("period = ?");
    values.push(Date_range);
  }
  if (term) {
    fields.push("term = ?");
    values.push(term);
  }
  if (project_code) {
    fields.push("project_code = ?");
    values.push(project_code);
  }
  if (typeof payment_charges !== "undefined") {
    fields.push("payment_charges = ?");
    values.push(payment_charges);
  }

  if (fields.length) {
    values.push(invoice_number);
    await client.execute({
      sql: `UPDATE invoices SET ${fields.join(", ")} WHERE invoice_number = ?`,
      args: values,
    });
  }

  // Step 3: Remove items
  if (items?.remove?.length) {
    for (const desc of items.remove) {
      await client.execute({
        sql: `DELETE FROM invoice_items WHERE invoice_id = ? AND description = ?`,
        args: [invoiceId, desc],
      });
    }
  }

  // Step 4: Add items
  if (items?.add?.length) {
    for (const item of items.add) {
      await client.execute({
        sql: `INSERT INTO invoice_items (invoice_id, description, base_rate, unit, amount) VALUES (?, ?, ?, ?, ?)`,
        args: [
          invoiceId,
          item.description,
          item.base_rate,
          item.unit,
          item.amount,
        ],
      });
    }
  }

  // Step 5: Replace items (Update)
  if (items?.replace?.length) {
    for (const item of items.replace) {
      const [updateResult] = await client.execute({
        sql: `UPDATE invoice_items SET base_rate = ?, unit = ?, amount = ? WHERE invoice_id = ? AND description = ?`,
        args: [
          item.base_rate,
          item.unit,
          item.amount,
          invoiceId,
          item.description,
        ],
      });
    }
  }

  // Step 6: Recalculate totals
  const { rows: updatedItems } = await client.execute({
    sql: `SELECT amount FROM invoice_items WHERE invoice_id = ?`,
    args: [invoiceId],
  });

  const subtotal = updatedItems.reduce((sum, i) => sum + Number(i.amount), 0);
  const finalCharges =
    typeof payment_charges !== "undefined"
      ? payment_charges
      : invoice.payment_charges;

  const total = subtotal + Number(finalCharges);

  await client.execute({
    sql: `UPDATE invoices SET subtotal = ?, total = ? WHERE id = ?`,
    args: [subtotal, total, invoiceId],
  });

  return { status: "success", invoice_id: invoiceId };
}
