import { NextResponse } from "next/server";
import { processRecurringInvoices } from "@/services/recurringInvoice.service";

export async function GET() {
  try {
    const results = await processRecurringInvoices();
    return NextResponse.json({
      success: true,
      sent: results.length,
      invoices: results,
    });
  } catch (error: any) {
    console.error("Recurring Invoice Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send recurring invoices" },
      { status: 500 }
    );
  }
}
