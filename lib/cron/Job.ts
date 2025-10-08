import cron from "node-cron";
import axios from "axios";
import "dotenv/config";

export function startCronJob() {
  console.log("Cron job initialized and waiting for the first run...");

  cron.schedule("*/1 * * * *", async () => {
    try {
      console.log("Running email fetch cron job...");
      await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/api/email`);
      console.log("Email check completed");
    } catch (error) {
      console.error("Cron error:", error);
    }
  });
}

startCronJob();
