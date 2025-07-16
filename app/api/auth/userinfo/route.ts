
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getRefreshToken } from "@/services/google.service";

export async function GET() {
  try {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      return NextResponse.json(
        { email: null, connected: false, error: "No refresh token found" },
        { status: 404 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.GOOGLE_REDIRECT_URI!
    );

    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    const email = data?.email || null;
    const isConnected = !!(refreshToken && email);

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
