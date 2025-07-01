import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function GET() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const url = oauth2Client.generateAuthUrl({
    scope: ["https://www.googleapis.com/auth/gmail.modify"],
    access_type: "offline",
    prompt: "consent",
  });

  return NextResponse.redirect(url);
}
