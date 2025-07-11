import fs from "fs/promises";
import path from "path";
import { google } from "googleapis";
import { simpleParser } from "mailparser";
import { createMimeMessage } from "mimetext";
import { getRefreshToken, getAutomateUser } from "@/lib/database";
import { generateInvoiceHtmlBody } from "@/lib/utils";

export async function sendInvoiceToApi(invoicePayload: any) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(invoicePayload),
  });
  console.log("Sending invoice to API:", invoicePayload)
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
  // Set the refresh toke to the OAuth2 client
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const accessToken = await oauth2Client.getAccessToken();
  console.log("Access Token:", accessToken);
  if (!accessToken) {
    throw new Error("Failed to get access token");
  }
  const label = process.env.GMAIL_QUERY_LABEL || "invoices";
  const subject = process.env.GMAIL_QUERY_SUBJECT || "Invoice Request";
  console.log("Label:", label);
  console.log("Subject:", subject);
  if (!label || !subject) {
    throw new Error("GMAIL_QUERY_LABEL and GMAIL_QUERY_SUBJECT must be set");
  }
  let response;
  try {
    response = await gmail.users.messages.list({
      userId: "me",
      q: `label:${label} is:unread subject:"${subject}"`,
      maxResults: 5,
    });
  } catch (err) {
    console.error(" Gmail API error:", err);
    throw new Error("Failed to fetch emails from Gmail");
  }
  

  console.log("Gmail response:", response.data);
  const messages = response.data.messages || [];
  const parsedInvoices = [];

  // Call once and reuse
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
      const invoicePayload = await parseInvoiceFromText(
        rawMsg.data.raw!,
        userId
      );

      parsedInvoices.push({ id: message.id, payload: invoicePayload });
    } catch (error) {
      console.warn(
        `Skipping invalid invoice in message ${message.id}:`,
        (error as Error).message
      );
    }
  }

  return { gmail, parsedInvoices, accessToken };
}

export async function parseInvoiceFromText(
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
