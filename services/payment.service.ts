import { Invoice } from "../database/models/invoice.model";
import { sendEmail } from "../lib/utilsServer";
import Config from "../database/models/config.model";

export async function checkUnpaidInvoicesAndSendReminder() {
  console.log("✅ Payment Reminder Cron Started");

  try {
    // Step 1: Get dynamic reminder gap
    const config = await Config.findOne({
      where: { keyIndex: "upaidInvoiceReminderDays" },
    });
    const remindAfterDays = config?.value ? parseInt(config.value) : 15;
    console.log("🔄 Reminder gap (days):", remindAfterDays);

    // Step 2: Get invoices that are unpaid
    const invoices = await Invoice.findAll({
      where: {
        status: ["sent", "partially paid"],
      },
    });
    console.log(`🔎 Found ${invoices.length} unpaid/partially paid invoices`);

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
      console.log(
        `📦 Invoice ${invoice.invoice_number}: ${daysSinceCreated} days old, Last reminded: ${daysSinceLastReminder} days ago`
      );

      const shouldSend =
        (!lastReminder && daysSinceCreated >= remindAfterDays) ||
        (lastReminder &&
          daysSinceLastReminder !== null &&
          daysSinceLastReminder >= remindAfterDays);

      if (shouldSend) {
        await sendEmail(
          invoice.client_email,
          `Payment Reminder: Invoice #${invoice.invoice_number}`,
          `Please complete your payment for Invoice #${invoice.invoice_number}.`
        );

        await Invoice.update(
          { lastUnpaidReminderDate: today },
          { where: { id: invoice.id } }
        );

        console.log(
          `✔ Reminder sent to ${invoice.client_email} for invoice ${invoice.invoice_number}`
        );
      }
    }
  } catch (err) {
    console.error("❌ Error in payment reminder check:", err);
  }
}
