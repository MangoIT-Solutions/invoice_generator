import { google } from "googleapis";
import { getRefreshToken } from "@/services/google.service"; 

export async function getGmailClient() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token in DB");

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const accessToken = await oauth2Client.getAccessToken();
  if (!accessToken) throw new Error("Failed to get access token");

  return { gmail, accessToken, oauth2Client };
}
