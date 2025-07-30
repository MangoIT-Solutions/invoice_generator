import { getAutomateUser, getRefreshToken } from "@/services/google.service";
import { google } from "googleapis";
import { simpleParser } from "mailparser";
import { parseEmailContentForUpdating } from "@/lib/server/parsers";
import { parseEmailContentForCreating } from "@/lib/server/parsers";
import { parseBankMailEmail } from "@/lib/server/parsers";
import { markEmailAsRead } from "@/lib/server/email";
import { createMimeMessage } from "mimetext";
import { gmail_v1 } from "googleapis";
import path from "path";
import fs from "fs/promises";


export async function getGmailClient() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token in DB");

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const accessToken = await oauth2Client.getAccessToken();
  if (!accessToken) throw new Error("Failed to get access token");

  return { gmail, accessToken, oauth2Client };
}

// Reads unread Gmail emails with a specific label and subject.
export async function parseEmailsFromGmail() {
  const { gmail, accessToken } = await getGmailClient();

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
      console.log("Parsed subject:", parsedEmail.subject);
      if (!parsedEmail.subject) {
        console.warn(`No subject found in message ${message.id}`);
        continue;
      }
      const subject = parsedEmail.subject || "";

      if (subject.includes("Invoice Update")) {
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

// Reads unread gmail for bank mails
export async function parseBankMailsFromGmail() {
  const { gmail } = await getGmailClient();

  const label = process.env.BANK_QUERY_LABEL || "bankMail";
  const subjectBankMail = process.env.GMAIL_BANKMAIL_SUBJECT || "Bank Mail";
  const userId = await getAutomateUser();
  const parsedBankMails = [];

  const response = await gmail.users.messages.list({
    userId: "me",
    q: `label:${label} is:unread`,
    maxResults: 5,
  });

  const messages = response.data.messages || [];

  for (const message of messages) {
    if (!message.id) continue;

    try {
      const rawMsg = await gmail.users.messages.get({
        userId: "me",
        id: message.id,
        format: "raw",
      });

      const parsedEmail = await simpleParser(
        Buffer.from(rawMsg.data.raw!, "base64")
      );
      const subject = (parsedEmail.subject || "").toLowerCase();

      if (subject.includes(subjectBankMail.toLowerCase())) {
        const payload = await parseBankMailEmail(rawMsg.data.raw!, userId);
        parsedBankMails.push({ id: message.id, payload, type: "bank_mail" });

        //  Mark email as read
        await markEmailAsRead(gmail, message.id);
      }
    } catch (err) {
      console.warn(
        ` Skipping bankMail ${message.id} — ${(err as Error).message}`
      );
    }
  }

  return parsedBankMails;
}

// Sends a PDF invoice as email to client using Gmail API and remind for unpaid invoices.:
export async function sendInvoiceByGmail(
  to: string,
  subject: string,
  text: string,
  pdfPath?: string
) {
  try {
    const { gmail } = await getGmailClient();

    const message = createMimeMessage();
    message.setSender("me");
    message.setRecipient(to);
    message.setSubject(subject);

    message.addMessage({ contentType: "text/plain", data: text });
    if (pdfPath) {
      const pdfBuffer = await fs.readFile(pdfPath);
      message.addMessage({ contentType: "text/html", data: text });

      message.addAttachment({
        filename: path.basename(pdfPath),
        contentType: "application/pdf",
        data: pdfBuffer.toString("base64"),
        encoding: "base64",
      });
    }
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
    console.error(" Failed to send invoice email:", error);
    throw error;
  }
}
