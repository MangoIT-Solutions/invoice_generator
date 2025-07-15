import { NextResponse } from "next/server";
import { parseEmailsFromGmail } from "@/lib/utilsServer";
import { sendInvoiceToApi } from "@/lib/utilsServer";
import { sendInvoiceByGmail } from "@/lib/utilsServer";
import { updateInvoiceFromPayload } from "@/lib/utilsServer";
import { generateInvoicePdf } from "@/lib/invoicePdf";
import path from "path";
import { client } from "@/lib/database"; 

export async function GET() {
  try {
    const { gmail, parsedInvoices } = await parseEmailsFromGmail();

    const results = [];

    for (const invoice of parsedInvoices) {
      let invoiceId: number | undefined;
      let invoiceNumber: string | undefined;

      if (invoice.type === "update") {
        // ✅ Update invoice
        const updateResult = await updateInvoiceFromPayload(invoice.payload);
        invoiceId = updateResult.invoice_id;
        invoiceNumber = invoice.payload.invoice_number;
        console.log("✅ Updated invoice:", invoiceId);

        // ✅ Fetch updated invoice and items
        const { rows: updatedInvoiceRows } = await client.execute({
          sql: "SELECT * FROM invoices WHERE id = ?",
          args: [invoiceId],
        });
        const updatedInvoice = Array.isArray(updatedInvoiceRows) ? updatedInvoiceRows[0] : undefined;

        const { rows: updatedItems } = await client.execute({
          sql: "SELECT * FROM invoice_items WHERE invoice_id = ?",
          args: [invoiceId],
        });

        // ✅ Fetch company and bank info (update if table name differs)
        const companyResult = await client.execute({
          sql: "SELECT * FROM company LIMIT 1",
          args: [],
        });
        const companyRows = Array.isArray(companyResult.rows) ? companyResult.rows : [];
        const company = companyRows[0];

        const { rows: bankRows } = await client.execute({
          sql: "SELECT * FROM bank_details LIMIT 1",
          args: [],
        });
        const bank = Array.isArray(bankRows) ? bankRows[0] : undefined;

        // ✅ Generate PDF
        await generateInvoicePdf(
          { ...updatedInvoice, items: updatedItems },
          company,
          bank,
          `invoice-${invoiceNumber}.pdf`
        );
      } else {
        // ✅ Create invoice
        const res = await sendInvoiceToApi(invoice.payload);
        invoiceId = res?.data?.invoiceId || res?.data?.id;
        invoiceNumber = res?.data?.invoiceNumber;
        console.log("🆕 Created invoice:", invoiceId);
      }

      if (!invoiceId || !invoiceNumber) {
        throw new Error("Invoice ID or number missing after create/update");
      }

      // ✅ PDF path
      const pdfPath = path.join(
        process.cwd(),
        "public",
        "invoices",
        `invoice-${invoiceNumber}.pdf`
      );

      const subject = `📄 Your Invoice #${invoiceNumber} from Mango IT Solutions`;
      const textBody = `Invoice #${invoiceNumber} attached.\nTotal: ₹${
        invoice.payload.total || invoice.payload.total_amount || "N/A"
      }`;

      // ✅ Send email with PDF
      await sendInvoiceByGmail(
        invoice.payload.senderEmail,
        subject,
        textBody,
        pdfPath
      );

      console.log("📧 Sent invoice email to:", invoice.payload.client_email);

      results.push({
        invoiceId,
        invoiceNumber,
        email: invoice.payload.client_email,
        client: invoice.payload.client_name,
        type: invoice.type,
      });

      // ✅ Mark email as read
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
