// services/invoice.service.ts
import { Invoice } from "@/database/models/invoice.model";
import { InvoiceItem } from "@/database/models/invoice-item.model";
import Config from "@/database/models/config.model";
import { User } from "@/database/models/user.model";
import { Company } from "@/database/models/company.model";
import { BankDetails } from "@/database/models/bank-details.model";
import { Sequelize } from "sequelize";
import { generateInvoicePdf } from "@/lib/invoicePdf";
import { getInvoicePdfPaths } from "@/lib/invoicePdf";

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
    // Fetch the latest invoice (numerically sorted)
    const lastInvoice = await Invoice.findOne({
      attributes: ["invoice_number"],
      order: [[Sequelize.cast(Sequelize.col("invoice_number"), "SIGNED"), "DESC"]],
    });

    if (lastInvoice?.invoice_number) {
      return (parseInt(lastInvoice.invoice_number, 10) + 1).toString();
    }

    // Fallback: use configured starting number
    const config = await Config.findOne({
      where: { key: "starting_number" },
      attributes: ["value"],
    });

    const startingNumber = parseInt(config?.getDataValue("value") ?? "1000", 10);

    return startingNumber.toString();
  } catch (error) {
    console.error("❌ Error generating next invoice number:", error);
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
          as: "user",
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
          as: "items",
        },
      ],
    });

    if (!invoice) return null;

    return {
      invoice: invoice.get({ plain: true }),
      items: (invoice as any).items,
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

// Updates an existing invoice based on the provided payload.
export async function updateInvoiceFromPayload(payload: any) {
  const {
    invoice_number,
    client_name,
    client_company_name,
    client_address,
    client_email,
    invoice_date,
    period,
    term,
    status,
    recurring_interval,
    project_code,
    payment_charges,
    items,
  } = payload;

  if (!invoice_number) throw new Error("Invoice number is required");

  // Step 1: Fetch invoice
  const invoice = await Invoice.findOne({
    where: { invoice_number },
    attributes: ["id", "payment_charges"],
  });

  if (!invoice) throw new Error("Invoice not found");

  const invoiceId = invoice.id;

  // Step 2: Update invoice fields
  const updateData: any = {};
  if (client_name) updateData.client_name = client_name;
  if (client_company_name) updateData.client_company_name = client_company_name;
  if (client_address) updateData.client_address = client_address;
  if (client_email) updateData.client_email = client_email;
  if (invoice_date) updateData.invoice_date = invoice_date;
  if (period) updateData.period = period;
  if (term) updateData.term = term;
  if (project_code) updateData.project_code = project_code;
  if (typeof payment_charges !== "undefined")
    updateData.payment_charges = payment_charges;
  if (typeof status !== "undefined") updateData.status = status;
  if (recurring_interval)
    updateData.recurring_interval = recurring_interval;

  if (Object.keys(updateData).length) {
    await Invoice.update(updateData, { where: { invoice_number } });
  }

  // Step 3: Remove items
  if (items?.remove?.length) {
    for (const desc of items.remove) {
      await InvoiceItem.destroy({
        where: {
          invoice_id: invoiceId,
          description: desc,
        },
      });
    }
  }

  // Step 4: Add items
  if (items?.add?.length) {
    for (const item of items.add) {
      const desc = item.description.trim();

      const existingItem = await InvoiceItem.findOne({
        where: {
          invoice_id: invoiceId,
          description: desc,
        },
      });

      if (existingItem) {
        console.log("Duplicate found:", existingItem.toJSON());
        continue;
      }

      const created = await InvoiceItem.create({
        invoice_id: invoiceId,
        description: desc,
        base_rate: item.base_rate,
        unit: item.unit,
        amount: item.amount,
      });
    }
  }

  // Step 5: Replace items (update)
  if (items?.replace?.length) {
    for (const item of items.replace) {
      await InvoiceItem.update(
        {
          base_rate: item.base_rate,
          unit: item.unit,
          amount: item.amount,
        },
        {
          where: {
            invoice_id: invoiceId,
            description: item.description,
          },
        }
      );
    }
  }

  // Step 6: Recalculate totals
  const updatedItems = await InvoiceItem.findAll({
    where: { invoice_id: invoiceId },
    attributes: ["amount"],
  });

  const subtotal = updatedItems.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );

  const finalCharges =
    typeof payment_charges !== "undefined"
      ? payment_charges
      : invoice.payment_charges;

  const total = subtotal + Number(finalCharges);

  await Invoice.update({ subtotal, total }, { where: { id: invoiceId } });

  const fullInvoice = await Invoice.findOne({
    where: { id: invoiceId },
    include: [
      {
        model: InvoiceItem,
        as: "items",
        attributes: ["description", "base_rate", "unit", "amount"],
      },
    ],
  });
  if (!fullInvoice) {
    throw new Error("Updated invoice not found");
  }

  return {
    status: "success",
    invoice_id: invoiceId,
    invoice_number,
    invoice: fullInvoice,
    message: "Invoice updated successfully",
  };
}

export async function generateAndSaveInvoicePdf(
  invoice: any,
  invoiceNumber: number
) {
  const company = await getCompanyConfig();
  const bank: any = await getBankDetails();
  const { fileName: pdfFileName, filePath: pdfPath } =
    getInvoicePdfPaths(invoiceNumber);

  if (!company || !bank) {
    throw new Error("Company or bank details missing.");
  }

  await generateInvoicePdf(invoice, company, bank, pdfFileName);
  return pdfPath;
}

export async function duplicateInvoiceItems(
  items: any[],
  newInvoiceId: number
) {
  const itemsToCreate = (items ?? []).map((item) => ({
    invoice_id: newInvoiceId,
    description: item.description,
    base_rate: item.base_rate,
    unit: item.unit,
    amount: item.amount,
  }));
  await InvoiceItem.bulkCreate(itemsToCreate);
}
