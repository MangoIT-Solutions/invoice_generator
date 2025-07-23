// import { NextResponse } from "next/server";
// import { Invoice } from "@/database/models/invoice.model";
// import { InvoiceItem } from "@/database/models/invoice-item.model";
// import { getCompanyConfig } from "@/services/company.service";
// import { getBankDetails } from "@/services/bank.service";
// import { generateInvoicePdf } from "@/lib/invoicePdf";
// import { sendInvoiceByGmail } from "@/lib/utilsServer";
// import { getNextInvoiceNumber } from "@/services/invoice.service";
// import path from "path";
// import { Op } from "sequelize";
// import { addMonths, isSameDay } from "date-fns";

// export async function GET() {
//   try {
//     const today = new Date();
//     const day = today.getDate();

//     const recurringInvoices = await Invoice.findAll({
//       where: {
//         recurring_interval: {
//           [Op.or]: ["once a month", "twice a month"],
//         },
//       },
//       include: [{ model: InvoiceItem, as: "items" }],
//     });

//     if (!recurringInvoices.length) {
//       return NextResponse.json({ message: "No recurring invoices found." });
//     }

//     const results = [];

//     for (const invoice of recurringInvoices) {
//       const isOnce = invoice.recurring_interval === "once a month";
//       const isTwice = invoice.recurring_interval === "twice a month";
//       const lastSent = invoice.lastInvoiceSendDate || invoice.created_at;

//       //  1. Timing Logic
//       if (isOnce) {
//         const nextInvoiceDate = addMonths(new Date(lastSent), 1);
//         if (!isSameDay(today, nextInvoiceDate)) continue;
//       }

//       if (isTwice && ![1, 15].includes(day)) continue;

//       //  2. Generate New Invoice
//       const invoiceNumber = await getNextInvoiceNumber();

//       const newInvoice = await Invoice.create({
//         invoice_number: invoiceNumber,
//         user_id: invoice.user_id,
//         client_name: invoice.client_name,
//         client_company_name: invoice.client_company_name,
//         client_address: invoice.client_address,
//         client_email: invoice.client_email,
//         invoice_date: today.toISOString().split("T")[0],
//         period: invoice.period,
//         term: invoice.term,
//         project_code: invoice.project_code,
//         subtotal: invoice.subtotal,
//         payment_charges: invoice.payment_charges,
//         total: invoice.total,
//         status: "sent",
//         created_at: today,
//         recurring_interval: null,
//         lastInvoiceSendDate: null,
//       });

//       // 3. Duplicate Items
//       const itemsToCreate = (invoice.items ?? []).map((item) => ({
//         invoice_id: newInvoice.id,
//         description: item.description,
//         base_rate: item.base_rate,
//         unit: item.unit,
//         amount: item.amount,
//       }));
//       await InvoiceItem.bulkCreate(itemsToCreate);

//       // Re-fetch the new invoice with its items
//       const invoiceWithItems = {
//         ...newInvoice.toJSON(),
//         items: invoice.items,
//       };

//       //  4. Generate PDF
//       const company = await getCompanyConfig();
//       const bank = await getBankDetails();
//       const pdfFileName = `invoice-${invoiceNumber}.pdf`;
//       const pdfPath = path.join(
//         process.cwd(),
//         "public",
//         "invoices",
//         pdfFileName
//       );
//       if (!invoice.items || invoice.items.length === 0) {
//         console.log(`Skipping invoice ${invoice.id}: No valid items`);
//         continue;
//       }
//       if (!company || !bank) {
//         console.error("Company or Bank details not found");
//         return NextResponse.json(
//           { error: "Company or Bank details not found" },
//           { status: 500 }
//         );
//       }
//       // Generate PDF
//       await generateInvoicePdf(
//         invoiceWithItems as any,
//         company,
//         bank,
//         pdfFileName
//       );

//       // ✅ 5. Send Email
//       const subject = `📄 Recurring Invoice #${invoiceNumber} - Mango IT Solutions`;
//       const message = `Dear ${invoice.client_name},\n\nPlease find attached your recurring invoice #${invoiceNumber}.\n\nTotal Amount: ₹${invoice.total}\n\nThanks.`;
//       await sendInvoiceByGmail(invoice.client_email, subject, message, pdfPath);

//       // ✅ 6. Update original invoice's `lastInvoiceSendDate`
//       invoice.lastInvoiceSendDate = today;
//       await invoice.save();

//       results.push({
//         originalInvoiceId: invoice.id,
//         newInvoiceId: newInvoice.id,
//         invoiceNumber,
//         email: invoice.client_email,
//         status: "sent",
//       });
//     }

//     return NextResponse.json({
//       success: true,
//       sent: results.length,
//       invoices: results,
//     });
//   } catch (error: any) {
//     console.error("Recurring Invoice Error:", error);
//     return NextResponse.json(
//       { error: error.message || "Failed to send recurring invoices" },
//       { status: 500 }
//     );
//   }
// }

import { NextResponse } from "next/server";
import { processRecurringInvoices } from "@/services/recurringInvoice.service";

export async function GET() {
  console.log("Received GET request for recurring invoices");
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
