import { checkUnpaidInvoicesAndSendReminder } from "@/services/payment.service";
import { NextResponse } from "next/server";

// ⛔ Placeholder imports — to be implemented later
// import { parsePaymentsFromGmail } from "@/lib/utilsServer";
// import { sendPaymentToApi } from "@/lib/utilsServer";
// import { sendPaymentConfirmation } from "@/lib/utilsServer";

export async function GET() {
  try {
    // ⛔ Step 1: Fetch and parse payment emails
    // const { gmail, parsedPayments } = await parsePaymentsFromGmail();
    await checkUnpaidInvoicesAndSendReminder();

    const results = [];

    // ⛔ Step 2: Process each parsed payment
    // for (const payment of parsedPayments) {
    //   const paymentResult = await sendPaymentToApi(payment.payload);

    //   // ⛔ Step 3: Send confirmation email or receipt (optional)
    //   await sendPaymentConfirmation(payment.payload.clientEmail, ...);

    //   results.push({
    //     paymentId: paymentResult.id,
    //     client: payment.payload.client_name,
    //     amount: payment.payload.amount,
    //   });

    //   // ⛔ Step 4: Mark email as read
    //   await gmail.users.messages.modify({
    //     userId: "me",
    //     id: payment.id,
    //     requestBody: {
    //       removeLabelIds: ["UNREAD"],
    //     },
    //   });
    // }

    // ✅ Temporary response until logic is ready
    // return NextResponse.json({
    //   success: true,
    //   message: "Payment processing route is set up",
    //   payments: results,
    // });
    return NextResponse.json({ message: "✅ Payment reminder executed" });
  } catch (error: any) {
    console.error("Payment Read Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process payment emails" },
      { status: 500 }
    );
  }
}
