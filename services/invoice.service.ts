// services/invoice.service.ts
import { Invoice } from "@/database/models/invoice.model";
import { InvoiceItem } from "@/database/models/invoice-item.model";
// import InvoiceConfig from "@/database/models/config.model";
import Config from "@/database/models/config.model";
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
    // Fetch starting number
    let startingConfig = await Config.findOne({
      where: { keyIndex: "starting_number" },
    });
    if (!startingConfig) {
      startingConfig = await Config.create({
        keyIndex: "starting_number",
        value: "1000",
      });
    }

    const startingNumber = parseInt(startingConfig.value || "1000", 10);

    // Fetch current number
    let currentConfig = await Config.findOne({
      where: { keyIndex: "current_number" },
    });
    if (!currentConfig) {
      currentConfig = await Config.create({
        keyIndex: "current_number",
        value: startingNumber.toString(),
      });
    }

    const currentNumber = parseInt(
      currentConfig.value || startingNumber.toString(),
      10
    );

    // Ensure current >= starting
    const nextNumber =
      currentNumber < startingNumber ? startingNumber + 1 : currentNumber + 1;

    // Save updated current number
    currentConfig.value = nextNumber.toString();
    await currentConfig.save();

    // Return current invoice number (before increment)
    return (
      currentNumber < startingNumber ? startingNumber : currentNumber
    ).toString();
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

// Updates an existing invoice based on the provided payload.
export async function updateInvoiceFromPayload(payload: any) {
  const {
    invoice_number,
    client_name,
    client_address,
    client_email,
    invoice_date,
    Date_range,
    term,
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
  if (client_address) updateData.client_address = client_address;
  if (client_email) updateData.client_email = client_email;
  if (invoice_date) updateData.invoice_date = invoice_date;
  if (Date_range) updateData.period = Date_range;
  if (term) updateData.term = term;
  if (project_code) updateData.project_code = project_code;
  if (typeof payment_charges !== "undefined")
    updateData.payment_charges = payment_charges;

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

  // Step 4: Add or Update items
  if (items?.add?.length) {
    for (const item of items.add) {
      await InvoiceItem.upsert({
        invoice_id: invoiceId,
        description: item.description,
        base_rate: item.base_rate,
        unit: item.unit,
        amount: item.amount,
      });
    }
  }

  // Step 5: Replace items (force update)
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

  return { status: "success", invoice_id: invoiceId };
}
