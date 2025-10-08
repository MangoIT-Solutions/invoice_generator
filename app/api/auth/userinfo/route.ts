import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getGmailClient } from "@/lib/server/gmail/gmail.service";

export async function GET() {
  try {
    const { oauth2Client } = await getGmailClient();

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    const email = data?.email || null;
    const isConnected = !!email;

    return NextResponse.json({
      email,
      connected: isConnected,
    });
  } catch (err) {
    console.error("Failed to get user info:", err);
    return NextResponse.json(
      { email: null, connected: false, error: "Failed to fetch user info" },
      { status: 500 }
    );
  }
}
