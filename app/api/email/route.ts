import { NextResponse } from "next/server";
import { parseEmailsFromGmail } from "@/lib/utilsServer";
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

      // 3. Path to the generated PDF
      const pdfPath = path.join(
        process.cwd(),
        "public",
        "invoices",
        `invoice-${invoiceNumber}.pdf`
      );

      // 4. Email content
      const subject = `📄 Your Invoice #${invoiceNumber} from Mango IT Solutions`;

      const textBody = `Invoice #${invoiceNumber} attached.\nTotal: ₹${invoice.payload.total_amount}`;

      // 5. Send formatted email with PDF
      await sendInvoiceByGmail(
        invoice.payload.senderEmail,
        subject,
        textBody,
        pdfPath
      );
      console.log("📧 Sending invoice to:", invoice.payload.client_email);
      console.log("🧾 Invoice payload:", invoice.payload);

      // 6. Add to result
      results.push({
        invoiceId,
        invoiceNumber,
        email: invoice.payload.client_email,
        client: invoice.payload.client_name,
      });

      // 7. Mark email as read
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
