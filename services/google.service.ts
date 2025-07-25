import Config from "@/database/models/config.model"; // Sequelize model
import bcrypt from "bcryptjs";
import { User } from "@/database/models/user.model";

// Save refresh token and connected Gmail
export async function saveRefreshToken(refreshToken: string, email: string) {
  await Config.upsert({
    keyIndex: "googleapiRefreshToken",
    value: refreshToken,
  });
  await Config.upsert({ keyIndex: "googleApiEmail", value: email });
}

//  Get refresh token
export async function getRefreshToken(): Promise<string | null> {
  const config = await Config.findOne({
    where: { keyIndex: "googleapiRefreshToken" },
  });
  return config?.getDataValue("value") || null;
}

//  Ensure automate user exists
export async function getAutomateUser(): Promise<number> {
  const username = process.env.AUTOMATE_USER || "automate";
  const email = `${username}@system.local`;
  const password = await bcrypt.hash("automate123", 10);

  let user = await User.findOne({ where: { username } });

  if (user) {
    return user.getDataValue("id");
  }

  const newUser = await User.create({
    username,
    email,
    password,
    role: "user",
  });

  return newUser.getDataValue("id");
}
