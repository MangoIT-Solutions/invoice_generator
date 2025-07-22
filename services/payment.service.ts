import { Invoice } from "../database/models/invoice.model";
import { sendInvoiceByGmail } from "../lib/utilsServer";
import Config from "../database/models/config.model";
import InvoicePayment from "@/database/models/invoice_payment.model";
import { Op } from "sequelize";

export async function lastUnpaidReminderDate() {
  try {
    // Get reminder gap from config
    const configData = await Config.findOne({
      where: { keyIndex: "upaidInvoiceReminderDays" },
    });

    if (!configData || !configData.value) {
      console.warn("⚠️ Reminder config not found. Skipping cron.");
      return;
    }

    const remindAfterDays = Number(configData.value);
    const invoices = await Invoice.findAll({
      where: {
        status: ["sent", "partially paid"],
      },
    });
    
    if (invoices.length === 0) {
      console.log("No unpaid invoices found.");
      return;
    }
    const today = new Date();

    for (const invoice of invoices) {
      const createdAt = new Date(invoice.created_at);
      const lastReminder = invoice.lastUnpaidReminderDate
        ? new Date(invoice.lastUnpaidReminderDate)
        : null;

      const daysSinceCreated = Math.floor(
        (today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      const daysSinceLastReminder = lastReminder
        ? Math.floor(
            (today.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24)
          )
        : null;

      const shouldSend =
        (!lastReminder && daysSinceCreated >= remindAfterDays) ||
        (lastReminder !== null &&
          daysSinceLastReminder !== null &&
          daysSinceLastReminder >= remindAfterDays);

      if (shouldSend) {
        await sendInvoiceByGmail(
          invoice.client_email,
          `⏰ Payment Reminder: Invoice #${invoice.invoice_number}`,
          `This is a friendly reminder to complete your payment for Invoice #${invoice.invoice_number}.\n\nThank you.`
        );

        await Invoice.update(
          { lastUnpaidReminderDate: today },
          { where: { id: invoice.id } }
        );

        console.log(
          `✔ Reminder sent to ${invoice.client_email} for Invoice #${invoice.invoice_number}`
        );
      }
    }
  } catch (err) {
    console.error("❌ Error in payment reminder check:", err);
  }
}
