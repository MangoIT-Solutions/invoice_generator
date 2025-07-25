import { getRefreshToken } from "@/services/google.service";
import { google } from "googleapis";
import { createMimeMessage } from "mimetext";
import path from "path";
import fs from "fs/promises";

// Sends parsed invoice data to API endpoint (`/api/invoices`) to create a new invoice record in DB.
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

// Sends a PDF invoice as email to client using Gmail API and remind for unpaid invoices.:
export async function sendInvoiceByGmail(
  to: string,
  subject: string,
  text: string,
  pdfPath?: string // Make optional
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
    console.error("❌ Failed to send invoice email:", error);
    throw error;
  }
}
