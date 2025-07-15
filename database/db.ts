// lib/init-db.ts
import sequelize from "./sequelize";
import { User } from "../model/user.model";
import { Invoice, associateInvoice } from "../model/invoice.model";
import {
    InvoiceItem,
    associateInvoiceItem,
} from "../model/invoice-item.model";
import { Company } from "../model/company.model";
import { BankDetails } from "../model/bank-details.model";
import { ProjectDetail } from "../model/project.model";

let initialized = false;
export const initDB = async () => {
    try {
        await sequelize.authenticate();
        console.log("Connection has been established successfully.");

        if (!initialized) {
            const models = { Invoice, InvoiceItem };
            associateInvoice(models);
            associateInvoiceItem(models);
            initialized = true; // prevent duplicate association registration
        }
        await sequelize.sync({ alter: true });
        console.log("All models were synchronized.");
    } catch (error) {
        console.error("Unable to connect to the database:", error);
    }
};
