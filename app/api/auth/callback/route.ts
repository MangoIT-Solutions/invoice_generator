import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { saveRefreshToken } from "@/services/google.service";

export async function GET(req: NextRequest) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  if (
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.GOOGLE_CLIENT_SECRET ||
    !process.env.GOOGLE_REDIRECT_URI
  ) {
    return NextResponse.json(
      { error: "Missing Google OAuth environment variables" },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code in request" }, { status: 400 });
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    console.log("OAuth tokens received:", tokens);
    console.log("Granted scopes:", tokens.scope);
    if (!tokens.scope?.includes("gmail.readonly")) {
      return NextResponse.json(
        { error: "Missing required Gmail scopes" },
        { status: 400 }
      );
    }

    const refreshToken = tokens.refresh_token;
    const accessToken = tokens.access_token;

    console.log("Scopes granted:", oauth2Client.credentials.scope);

    if (!refreshToken || !accessToken) {
      return NextResponse.json(
        { error: "Missing refresh or access token" },
        { status: 400 }
      );
    }

    // Use access token to fetch user email
    oauth2Client.setCredentials({ access_token: accessToken });
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    const email = data.email;

    if (!email) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }
    // Save refresh token and email
    await saveRefreshToken(refreshToken, email);

    return NextResponse.redirect(new URL("/google-authentication", req.url));
  } catch (error) {
    console.error("OAuth Callback Error:", error);
    return NextResponse.json({ error: "OAuth failed" }, { status: 500 });
  }
}
