import { Invoice } from "../database/models/invoice.model";
import { sendInvoiceEmail } from "@/lib/server/gmail/gmail.service";
import Config from "../database/models/config.model";
import { getInvoiceEmailContent } from "@/lib/server/email";

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
        const { subject, message } = getInvoiceEmailContent("reminder", {
          ...invoice,
          invoice_number: Number(invoice.invoice_number),
        });
        await sendInvoiceEmail(invoice.senderEmail || "", subject, message);

        // Update last reminder date
        await Invoice.update(
          { lastUnpaidReminderDate: today },
          { where: { id: invoice.id } }
        );
      }
    }
  } catch (err) {
    console.error(" Error in payment reminder check:", err);
    throw err;
  }
}
