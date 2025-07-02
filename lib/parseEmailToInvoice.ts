import { google } from "googleapis";
import { simpleParser } from "mailparser";
import { getRefreshToken, getAutomateUser } from "@/lib/database"; 
import { parseInvoiceFromText } from "@/lib/parseInvoiceText";

export async function parseEmailsFromGmail() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token in DB");

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const response = await gmail.users.messages.list({
    userId: "me",
    q: 'label:invoices is:unread subject:"Invoice Request"',
    maxResults: 5,
  });

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

    const parsed = await simpleParser(Buffer.from(rawMsg.data.raw!, "base64"));
    const senderEmail = parsed.from?.text || "";
    const bodyText = parsed.text || "";

    try {
      const invoicePayload = await parseInvoiceFromText(
        bodyText,
        senderEmail,
        userId // using dynamic user ID
      );
      parsedInvoices.push({ id: message.id, payload: invoicePayload });
    } catch (error) {
      console.warn(
        `Skipping invalid invoice in message ${message.id}:`,
        (error as Error).message
      );
    }
  }

  return { gmail, parsedInvoices };
}
