import { sendUnpaidInvoiceReminders } from "@/services/payment.service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await sendUnpaidInvoiceReminders();
    return NextResponse.json({ message: "Payment reminder sent" });
  } catch (error: any) {
    console.error("Payment Read Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process payment emails" },
      { status: 500 }
    );
  }
}
