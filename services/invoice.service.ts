// services/invoice.service.ts
import { Invoice } from "@/database/models/invoice.model";
import { InvoiceItem } from "@/database/models/invoice-item.model";
import InvoiceConfig from "@/database/models/config.model";
import { User } from "@/database/models/user.model";
import { Company } from "@/database/models/company.model";
import { BankDetails } from "@/database/models/bank-details.model";

export async function createInvoice(
  invoiceData: Omit<Invoice, "id" | "created_at">,
  items: Omit<InvoiceItem, "id" | "invoice_id">[]
) {
  const sequelize = Invoice.sequelize;
  if (!sequelize) throw new Error("Sequelize instance not available");

  const transaction = await sequelize.transaction();

  try {
    const invoice = await Invoice.create(invoiceData, { transaction });
    const invoiceId = invoice.getDataValue("id");

    const itemsWithInvoiceId = items.map((item) => ({
      ...item,
      invoice_id: invoiceId,
    }));

    await InvoiceItem.bulkCreate(itemsWithInvoiceId, { transaction });

    await transaction.commit();
    return invoiceId;
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating invoice:", error);
    throw error;
  }
}

export async function getNextInvoiceNumber(): Promise<string> {
  try {
    const config = await InvoiceConfig.findOne();
    if (!config) throw new Error("InvoiceConfig not found");

    const currentNumber =
      config.current_number < config.starting_number
        ? config.starting_number
        : config.current_number;

    config.current_number = currentNumber + 1;
    await config.save();

    return currentNumber.toString();
  } catch (error) {
    console.error("Error getting next invoice number:", error);
    return "1000";
  }
}

export async function getUserInvoices(userId?: number) {
  try {
    const where = userId ? { user_id: userId } : undefined;

    const invoices = await Invoice.findAll({
      where,
      include: [
        {
          model: User,
          attributes: ["id", "username"],
          as: "user", // this must match your Invoice.belongsTo(User, { as: 'user' })
        },
      ],
      order: [["created_at", "DESC"]],
    });

    // Convert Sequelize instances to plain objects
    return invoices.map((invoice) => invoice.get({ plain: true }));
  } catch (error) {
    console.error("Error fetching user invoices:", error);
    return [];
  }
}

export async function getInvoiceWithItems(invoiceId: number) {
  try {
    const invoice = await Invoice.findOne({
      where: { id: invoiceId },
      include: [
        {
          model: InvoiceItem,
          as: "items", // 👈 This must match the alias in hasMany()
        },
      ],
    });

    if (!invoice) return null;

    return {
      invoice: invoice.get({ plain: true }),
      items: (invoice as any).items, // Or use `.getDataValue('items')` if needed
    };
  } catch (error) {
    console.error("Error fetching invoice with items:", error);
    return null;
  }
}

export async function getCompanyConfig() {
  try {
    const company = await Company.findOne();
    if (!company) return null;

    const plain = company.get({ plain: true }) as any;
    if (plain.company_logo && !plain.logo) plain.logo = plain.company_logo;

    return plain;
  } catch (error) {
    console.error("Error fetching company config:", error);
    return null;
  }
}

export async function getBankDetails() {
  try {
    const bank = await BankDetails.findOne();
    if (!bank) return null;
    return bank.get({ plain: true });
  } catch (error) {
    console.error("Error fetching bank details:", error);
    return null;
  }
}
