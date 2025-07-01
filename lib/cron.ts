// lib/cron.ts
import cron from "node-cron";
import axios from "axios";

export function startCronJob() {
  // Run every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      console.log("Running email fetch cron job...");
      await axios.get("http://localhost:3000/api/email");
      console.log("Email check completed");
    } catch (error) {
      console.error("Cron error:", error);
    }
  });
}
