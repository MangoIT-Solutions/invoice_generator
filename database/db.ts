// lib/init-db.ts
import sequelize from "./sequelize";
import { User } from "./models/user.model";
import { Invoice, associateInvoice } from "./models/invoice.model";
import { InvoiceItem, associateInvoiceItem } from "./models/invoice-item.model";
import { Company } from "./models/company.model";
import { BankDetails } from "./models/bank-details.model";
import { ProjectDetail } from "./models/project.model";
import Config from "@/database/models/config.model";

let initialized = false;
export const initDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");

    if (!initialized) {
      const models = { Invoice, InvoiceItem };
      associateInvoice(models);
      associateInvoiceItem(models);
      initialized = true;
    }
    await sequelize.sync({ alter: true });
    console.log("All models were synchronized.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};
