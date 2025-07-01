// app/api/hello/route.ts (or any route you hit once on startup)
import { startCronJob } from "@/lib/cron";
import { NextResponse } from "next/server";

startCronJob();
export async function GET() {
  return NextResponse.json({ message: "Cron initialized!" });
}
