import { NextRequest, NextResponse } from "next/server";
import { processBankMail } from "@/services/bank.service";

export async function GET(request: NextRequest) {
  try {
    const results = await processBankMail();
    return NextResponse.json({
      success: true,
      processed: results.length,
      mails: results,
    });
  } catch (error: any) {
    console.error("Bank Mail Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process bank mails" },
      { status: 500 }
    );
  }
}
