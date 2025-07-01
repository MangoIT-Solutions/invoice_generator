import { google } from "googleapis";
import { simpleParser } from "mailparser";
import { NextResponse } from "next/server";
import { getRefreshToken } from "@/lib/database";

export async function GET() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return NextResponse.json(
      { error: "Refresh token not found in DB" },
      { status: 500 }
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  console.log("OAuth2 Client Created:", oauth2Client);

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });
  console.log(oauth2Client.credentials);

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  try {
    const response = await gmail.users.messages.list({
      userId: "me",
      q: 'label:invoices is:unread subject:"Invoice Request"',
      maxResults: 5,
    });

    const messages = response.data.messages || [];
    const emails: any[] = [];

    for (const message of messages) {
      if (!message.id) continue;

      const msg = await gmail.users.messages.get({
        userId: "me",
        id: message.id,
        format: "raw",
      });

      const parsed = await simpleParser(Buffer.from(msg.data.raw!, "base64"));

      emails.push({
        id: msg.data.id,
        from: parsed.from?.text,
        subject: parsed.subject,
        body: parsed.text,
      });

      // ✅ Mark email as read
      await gmail.users.messages.modify({
        userId: "me",
        id: message.id,
        requestBody: {
          removeLabelIds: ["UNREAD"],
        },
      });
    }
    console.log("Emails fetched successfully:", emails);
    ``;

    return NextResponse.json({ emails });
  } catch (error: any) {
    console.error("Gmail Read Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch emails" },
      { status: 500 }
    );
  }
}
