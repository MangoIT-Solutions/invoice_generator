import fs from "fs/promises";
import { google } from "googleapis";
import { createMimeMessage } from "mimetext";
import path from "path";
import { getRefreshToken } from "./database";

export async function sendInvoiceByGmail(
  to: string,
  subject: string,
  text: string,
  pdfPath: string
) {
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

  // Build a nice HTML message
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h4>Dear Customer,</h4>
      <p>Thank you for your business. Please find your invoice attached as a PDF.</p>
      <p>If you have any questions, feel free to reply to this email.</p>
      <p style="margin-top: 30px;">Warm regards,<br><strong>The InvoiceBot Team</strong></p>
    </div>
  `;

  //  Create MIME message
  const message = createMimeMessage();
  message.setSender("me");
  message.setRecipient(to);
  message.setSubject(subject);

  // Add plain text (fallback)
  message.addMessage({
    contentType: "text/plain",
    data: text,
  });

  // Add HTML version
  message.addMessage({
    contentType: "text/html",
    data: htmlBody,
  });

  // Add PDF attachment
  message.addAttachment({
    filename: path.basename(pdfPath),
    contentType: "application/pdf",
    data: pdfBuffer.toString("base64"),
    encoding: "base64",
  });

  // Gmail wants base64url-encoded raw string
  const encodedMessage = Buffer.from(message.asRaw())
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
    },
  });

  return res;
}
