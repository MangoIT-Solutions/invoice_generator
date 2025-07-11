import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!;

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
  ];
  console.log("Generating Google OAuth URL with scopes:", scopes);

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
    include_granted_scopes: false,
  });
  console.log(
    " Visit this URL in your browser to re-authorize Gmail access:\n"
  );
  console.log("Generated Google OAuth URL:", url);

  return NextResponse.json({ url });
}
