import { getAutomateUser, getRefreshToken } from "@/services/google.service";
import { google } from "googleapis";
import { simpleParser } from "mailparser";
import { parseEmailContentForUpdating } from "../parsers/invoiceUpdateParser";
import { parseEmailContentForCreating } from "../parsers/invoiceCreateParser";
import { parseBankMailEmail } from "../parsers/bankMailParser";
import { markEmailAsRead } from "../email.utils";

// Reads unread Gmail emails with a specific label and subject.
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
      console.log("Parsed subject:", parsedEmail.subject);
      if (!parsedEmail.subject) {
        console.warn(`No subject found in message ${message.id}`);
        continue;
      }
      const subject = parsedEmail.subject || "";
      console.log("📧 Email subject:", subject);

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
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token in DB");

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

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
