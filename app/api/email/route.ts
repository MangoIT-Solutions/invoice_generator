import { NextResponse } from "next/server";
import { parseEmailsFromGmail } from "@/lib/parseEmailToInvoice";
import { sendInvoiceToApi } from "@/lib/sendInvoiceToApi";
import { sendInvoiceByGmail } from "@/lib/sendInvoiceByGmail";
import path from "path";

export async function GET() {
  try {
    const { gmail, parsedInvoices } = await parseEmailsFromGmail();

    const results = [];

    for (const invoice of parsedInvoices) {
      // 1. Save invoice to DB
      const res = await sendInvoiceToApi(invoice.payload);

      // 2. Extract invoice ID safely

      const invoiceId = res?.data?.invoiceId || res?.data?.id; 
      const invoiceNumber = res?.data?.invoiceNumber;

      if (!invoiceId) throw new Error("Invoice ID missing after save");

      console.log("Saved Invoice Response:", res);
      console.log("Resolved Invoice ID:", invoiceId);

      // 3. Path to the generated PDF in public/invoices/
      const pdfPath = path.join(
        process.cwd(),
        "public",
        "invoices",
        `invoice-${invoiceNumber}.pdf`
      );

      // 4. Send email with attached PDF to original sender
      await sendInvoiceByGmail(
        invoice.payload.client_email,
        `Invoice #${invoiceId}`,
        "Please find your invoice attached.",
        pdfPath
      );

      // 5. Push response result
      results.push({ invoiceId, email: invoice.payload.client_email });

      // 6. Mark email as read
      await gmail.users.messages.modify({
        userId: "me",
        id: invoice.id,
        requestBody: {
          removeLabelIds: ["UNREAD"],
        },
      });
    }

    return NextResponse.json({ success: true, invoices: results });
  } catch (error: any) {
    console.error("Email Read Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process emails" },
      { status: 500 }
    );
  }
}
