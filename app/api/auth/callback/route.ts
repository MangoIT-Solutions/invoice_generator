import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { saveRefreshToken } from "@/lib/database";

export async function GET(req: NextRequest) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code in request" }, { status: 400 });
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "No refresh token returned" },
        { status: 400 }
      );
    }

    // Save the refresh token to the database
    await saveRefreshToken(refreshToken);

    //  Redirect to email reading endpoint
    return NextResponse.redirect(new URL("/api/email", req.url));
  } catch (error) {
    console.error("OAuth Callback Error:", error);
    return NextResponse.json({ error: "OAuth failed" }, { status: 500 });
  }
}
