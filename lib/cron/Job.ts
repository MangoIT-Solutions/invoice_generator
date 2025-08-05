import cron from "node-cron";
import axios from "axios";
export function startCronJob() {
  console.log("Cron jobs initialized and waiting...");

  //  Email check every 1 min
  cron.schedule("*/1 * * * *", async () => {
    try {
      console.log(" Running email fetch cron job...");
      await axios.get("http://localhost:3000/api/email");
      console.log(" Email check completed");
    } catch (error) {
      console.error("Email cron error:", error);
    }
  });

  //  Payment reminder every 1 min
  cron.schedule("*/1 * * * *", async () => {
    try {
      console.log("Running payment reminder check...");
      await axios.get("http://localhost:3000/api/invoiceReminderEmail");
      console.log("Payment reminder check completed");
    } catch (error) {
      console.error(" Payment reminder cron error:", error);
    }
  });

  //  Invoice generation every 1 min for recurring invoices
  cron.schedule("*/1 * * * *", async () => {
    try {
      console.log("Running recurring invoice generation cron job...");
      await axios.get("http://localhost:3000/api/recurringInvoice");
      console.log("Recurring Invoice generation completed");
    } catch (error) {
      console.error("Invoice generation cron error:", error);
    }
  });

  // Bank mail processing every 1 mi
  cron.schedule("*/1 * * * *", async () => {
    try {
      console.log("Running bank mail processing cron job...");
      await axios.get("http://localhost:3000/api/bankMail");
      console.log("Bank mail processing completed");
    } catch (error) {
      console.error("Bank mail cron error:", error);
    }
  });
}

// Start the cron jobs
startCronJob();
