import { Invoice } from "../database/models/invoice.model";
import { sendInvoiceByGmail } from "../lib/utilsServer";
import Config from "../database/models/config.model";

export async function lastUnpaidReminderDate() {
  try {
    // Get reminder gap from config
    const configData = await Config.findOne({
      where: { keyIndex: "upaidInvoiceReminderDays" },
    });

    // If config not found, skip
    if (!configData || !configData.value) {
      console.warn(" Reminder config not found. Skipping cron.");
      return;
    }

    // Parse reminder gap to number
    const remindAfterDays = Number(configData.value);

    // Fetch all invoices that are sent or partially paid
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

    // Loop through each invoice and check if reminder should be sent
    for (const invoice of invoices) {
      const createdAt = new Date(invoice.created_at);
      const lastReminder = invoice.lastUnpaidReminderDate
        ? new Date(invoice.lastUnpaidReminderDate)
        : null;

      //Calculate how many days passed since invoice creation
      const daysSinceCreated = Math.floor(
        (today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate how many days passed since last reminder
      const daysSinceLastReminder = lastReminder
        ? Math.floor(
            (today.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24)
          )
        : null;

      // Determine if reminder should be sent
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
        
        // Update last reminder date
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
    throw err;
  }
}
