import { NextResponse } from "next/server";
import { parseEmailsFromGmail } from "@/lib/utilsServer";
import { sendInvoiceToApi } from "@/lib/utilsServer";
import { sendInvoiceByGmail } from "@/lib/utilsServer";
import { updateInvoiceFromPayload } from "@/lib/utilsServer";
import { generateInvoicePdf } from "@/lib/invoicePdf";
import { getCompanyConfig } from "@/services/company.service";
import { getBankDetails } from "@/services/bank.service";
import path from "path";
import { Invoice } from "@/database/models/invoice.model";
import { InvoiceItem } from "@/database/models/invoice-item.model";

export async function GET() {
  try {
    const { gmail, parsedInvoices } = await parseEmailsFromGmail();

    const results = [];

    for (const invoice of parsedInvoices) {
      let invoiceId: number | undefined;
      let invoiceNumber: string | undefined;

      if (invoice.type === "update") {
        //  Update invoice
        const updateResult = await updateInvoiceFromPayload(invoice.payload);
        invoiceId = updateResult.invoice_id;
        invoiceNumber = invoice.payload.invoice_number;

        // Fetch updated invoice and items using Sequelize (as model instances)
        const updatedInvoice = await Invoice.findByPk(invoiceId, {
          include: [{ model: InvoiceItem, as: "items" }],
        });

        if (!updatedInvoice) {
          throw new Error("Updated invoice not found");
        }

        //  Fetch company and bank info (update if table name differs)
        const company = await getCompanyConfig();
        const bank = await getBankDetails();

        // Generate PDF
        await generateInvoicePdf(
          updatedInvoice as any, // InvoiceWithItems type
          company,
          bank,
          `invoice-${invoiceNumber}.pdf`
        );
      } else {
        // Create invoice
        const res = await sendInvoiceToApi(invoice.payload);
        invoiceId = res?.data?.invoiceId || res?.data?.id;
        invoiceNumber = res?.data?.invoiceNumber;
      }

      if (!invoiceId || !invoiceNumber) {
        throw new Error("Invoice ID or number missing after create/update");
      }

      // PDF path
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
