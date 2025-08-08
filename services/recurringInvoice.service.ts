import { Invoice } from "@/database/models/invoice.model";
import { InvoiceItem } from "@/database/models/invoice-item.model";
import { sendInvoiceEmail } from "@/lib/server/gmail/gmail.service";
import { getNextInvoiceNumber } from "@/services/invoice.service";
import { Op } from "sequelize";
import { addMonths, isSameDay } from "date-fns";
import { getInvoiceEmailContent } from "@/lib/server/email";
import { generateAndSaveInvoicePdf } from "@/services/invoice.service";
import { duplicateInvoiceItems } from "@/services/invoice.service";

export async function generateRecurringInvoices(today: Date = new Date()) {
  const day = today.getDate();

  //  Fetch all recurring invoices
  const recurringInvoices = await Invoice.findAll({
    where: {
      recurring_interval: {
        [Op.or]: ["once a month", "twice a month"],
      },
    },
    include: [{ model: InvoiceItem, as: "items" }],
  });

  const results = [];

  for (const invoice of recurringInvoices) {
    const isOnce = invoice.recurring_interval === "once a month";
    const isTwice = invoice.recurring_interval === "twice a month";
    const lastSent = invoice.lastInvoiceSendDate || invoice.created_at;

    //  1. Timing Logic
    if (isOnce) {
      const nextInvoiceDate = addMonths(new Date(lastSent), 1);
      if (!isSameDay(today, nextInvoiceDate)) continue;
    }
    if (isTwice && ![1, 15].includes(day)) continue;

    //  2. Generate New Invoice
    const invoiceNumber = await getNextInvoiceNumber();

    const newInvoice = await Invoice.create({
      invoice_number: invoiceNumber,
      user_id: invoice.user_id,
      client_name: invoice.client_name,
      client_company_name: invoice.client_company_name,
      client_address: invoice.client_address,
      client_email: invoice.client_email,
      invoice_date: today.toISOString().split("T")[0],
      period: invoice.period,
      term: invoice.term,
      project_code: invoice.project_code,
      subtotal: invoice.subtotal,
      payment_charges: invoice.payment_charges,
      total: invoice.total,
      status: "sent",
      created_at: today,
      recurring_interval: null,
      lastInvoiceSendDate: null,
    });

    // 3. Duplicate Items
    await duplicateInvoiceItems(invoice.items ?? [], newInvoice.id);

    //  4. Generate PDF
    const invoiceWithItems = { ...newInvoice.toJSON(), items: invoice.items };
    const pdfPath = await generateAndSaveInvoicePdf(
      invoiceWithItems,
      Number(invoiceNumber)
    );

    //  5. Send Email
    const senderEmail = invoice.senderEmail ?? "";
    if (!senderEmail) {
      throw new Error("Sender email is missing for recurring invoice.");
    }
    const { subject, message } = getInvoiceEmailContent("recurring", {
      invoice_number: Number(invoiceNumber),
      client_name: invoice.client_name,
      client_email: senderEmail,
      total: invoice.total,
    });

    await sendInvoiceEmail(senderEmail, subject, message, pdfPath);

    // 6. Update original invoice's `lastInvoiceSendDate`
    invoice.lastInvoiceSendDate = today;
    await invoice.save();

    results.push({
      originalInvoiceId: invoice.id,
      newInvoiceId: newInvoice.id,
      invoiceNumber,
      email: invoice.client_email,
      status: "sent",
    });
  }

  return results;
}
