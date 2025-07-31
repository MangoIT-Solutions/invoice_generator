import { NextResponse } from "next/server";
import { parseEmailsFromGmail } from "@/lib/server/gmail/gmail.service";
import { sendInvoiceByGmail } from "@/lib/server/gmail/gmail.service";
import { updateInvoiceFromPayload } from "@/services/invoice.service";
import { generateInvoicePdf } from "@/lib/invoicePdf";
import { getCompanyConfig } from "@/services/company.service";
import { getBankDetails } from "@/services/bank.service";
import { Invoice } from "@/database/models/invoice.model";
import { InvoiceItem } from "@/database/models/invoice-item.model";
import { getInvoiceEmailContent } from "@/lib/server/email";
import { getInvoicePdfPaths } from "@/lib/invoicePdf";
import { markEmailAsRead } from "@/lib/server/email";
import { sendInvoiceToApi } from "@/lib/client/api.utils";

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
        invoiceNumber = updateResult.invoice_number;
        if (!invoiceId || !invoiceNumber) {
          throw new Error("Invoice ID or number missing after update");
        }
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
          updatedInvoice as any,
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
      const { filePath: pdfPath } = await getInvoicePdfPaths(
        Number(invoiceNumber)
      );
      const { subject, message: textBody } = getInvoiceEmailContent("normal", {
        invoice_number: Number(invoiceNumber),
        client_name: invoice.payload.client_name,
        client_email: invoice.payload.client_email,
        total: invoice.payload.total,
        total_amount: invoice.payload.total_amount,
      });

      //  Send email with PDF
      await sendInvoiceByGmail(
        invoice.payload.senderEmail,
        subject,
        textBody,
        pdfPath
      );
      results.push({
        invoiceId,
        invoiceNumber,
        email: invoice.payload.client_email,
        client: invoice.payload.client_name,
        type: invoice.type,
      });

      //  Mark email as read
      await markEmailAsRead(gmail, invoice.id);
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
