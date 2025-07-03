<<<<<<< HEAD
import { client } from './database';
import type { Invoice, InvoiceItem } from './database';
import type { RowDataPacket } from 'mysql2';

export async function getNextInvoiceNumber(): Promise<string> {
  try {
    const result = await client.execute('SELECT starting_number, current_number FROM invoice_config LIMIT 1');
    const rows: RowDataPacket[] = Array.isArray(result.rows) ? (result.rows as RowDataPacket[]) : [];
=======
import { client } from "./database";
import type { Invoice, InvoiceItem } from "./database";
import type { RowDataPacket } from "mysql2";

export async function getNextInvoiceNumber(): Promise<string> {
  try {
    const result = await client.execute(
      "SELECT starting_number, current_number FROM invoice_config LIMIT 1"
    );
    const rows: RowDataPacket[] = Array.isArray(result.rows)
      ? (result.rows as RowDataPacket[])
      : [];
>>>>>>> emailReader
    let currentNumber = rows[0]?.current_number;
    const startingNumber = rows[0]?.starting_number ?? 1000;

    // If current_number is not set or is less than starting_number, use starting_number
    if (!currentNumber || currentNumber < startingNumber) {
      currentNumber = startingNumber;
    }

    // Update current_number for the next invoice
    await client.execute({
<<<<<<< HEAD
      sql: 'UPDATE invoice_config SET current_number = ? WHERE id = 1',
      args: [currentNumber + 1]
=======
      sql: "UPDATE invoice_config SET current_number = ? WHERE id = 1",
      args: [currentNumber + 1],
>>>>>>> emailReader
    });

    return currentNumber.toString();
  } catch (error) {
<<<<<<< HEAD
    console.error('Error getting next invoice number:', error);
    return '1000';
  }
}

export async function createInvoice(invoice: Omit<Invoice, 'id' | 'created_at'>, items: Omit<InvoiceItem, 'id' | 'invoice_id'>[]) {
  try {
    // Create invoice
    const invoiceResult = await client.execute({
      sql: `INSERT INTO invoices (
        invoice_number, user_id, client_name, client_company_name, client_address, client_email,
        invoice_date, period, term, project_code,
        subtotal, payment_charges, total, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
=======
    console.error("Error getting next invoice number:", error);
    return "1000";
  }
}

export async function createInvoice(
  invoice: Omit<Invoice, "id" | "created_at">,
  items: Omit<InvoiceItem, "id" | "invoice_id">[]
) {
  try {
    // Create invoice
    const invoiceResult = await client.execute({
      // sql: `INSERT INTO invoices (
      //   invoice_number, user_id, client_name, client_company_name, client_address, client_email,
      //   invoice_date, period, term, project_code,
      //   subtotal, payment_charges, total, status
      // ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      sql: `INSERT INTO invoices (
        invoice_number, user_id, client_name, client_company_name, client_address, client_email,
        invoice_date, period, term, project_code,
        subtotal, payment_charges, total, status, type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,

>>>>>>> emailReader
      args: [
        invoice.invoice_number,
        invoice.user_id,
        invoice.client_name,
<<<<<<< HEAD
        invoice.client_company_name || '',
=======
        invoice.client_company_name || "",
>>>>>>> emailReader
        invoice.client_address,
        invoice.client_email,
        invoice.invoice_date,
        invoice.period,
        invoice.term,
        invoice.project_code,
        invoice.subtotal,
        invoice.payment_charges,
        invoice.total,
<<<<<<< HEAD
        invoice.status
      ]
=======
        invoice.status,
        invoice.type || "manual", // default to 'manual' if not provided
      ],
>>>>>>> emailReader
    });

    const invoiceId = invoiceResult.meta?.last_row_id as number;

    // Create invoice items
    for (const item of items) {
      await client.execute({
<<<<<<< HEAD
        sql: 'INSERT INTO invoice_items (invoice_id, description, base_rate, unit, amount) VALUES (?, ?, ?, ?, ?)',
        args: [invoiceId, item.description, item.base_rate, item.unit, item.amount]
=======
        sql: "INSERT INTO invoice_items (invoice_id, description, base_rate, unit, amount) VALUES (?, ?, ?, ?, ?)",
        args: [
          invoiceId,
          item.description,
          item.base_rate,
          item.unit,
          item.amount,
        ],
>>>>>>> emailReader
      });
    }

    return invoiceId;
  } catch (error) {
<<<<<<< HEAD
    console.error('Error creating invoice:', error);
=======
    console.error("Error creating invoice:", error);
>>>>>>> emailReader
    throw error;
  }
}

export async function getUserInvoices(userId?: number) {
  try {
    let result;
    if (userId) {
      result = await client.execute({
        sql: `SELECT invoices.*, users.username FROM invoices LEFT JOIN users ON invoices.user_id = users.id WHERE invoices.user_id = ? ORDER BY invoices.created_at DESC`,
<<<<<<< HEAD
        args: [userId]
=======
        args: [userId],
>>>>>>> emailReader
      });
    } else {
      result = await client.execute({
        sql: `SELECT invoices.*, users.username FROM invoices LEFT JOIN users ON invoices.user_id = users.id ORDER BY invoices.created_at DESC`,
<<<<<<< HEAD
        args: []
=======
        args: [],
>>>>>>> emailReader
      });
    }
    return Array.isArray(result.rows) ? result.rows : [];
  } catch (error) {
<<<<<<< HEAD
    console.error('Error fetching user invoices:', error);
=======
    console.error("Error fetching user invoices:", error);
>>>>>>> emailReader
    return [];
  }
}

<<<<<<< HEAD
export async function getInvoiceWithItems(invoiceId: number): Promise<{ invoice: Invoice; items: InvoiceItem[] } | null> {
  try {
    const invoiceResult = await client.execute({
      sql: 'SELECT * FROM invoices WHERE id = ?',
      args: [invoiceId]
=======
export async function getInvoiceWithItems(
  invoiceId: number
): Promise<{ invoice: Invoice; items: InvoiceItem[] } | null> {
  try {
    const invoiceResult = await client.execute({
      sql: "SELECT * FROM invoices WHERE id = ?",
      args: [invoiceId],
>>>>>>> emailReader
    });
    const invoiceRows = invoiceResult.rows as RowDataPacket[];
    if (invoiceRows.length === 0) {
      return null;
    }
    const invoice = invoiceRows[0] as Invoice;

    const itemsResult = await client.execute({
<<<<<<< HEAD
      sql: 'SELECT * FROM invoice_items WHERE invoice_id = ?',
      args: [invoiceId]
=======
      sql: "SELECT * FROM invoice_items WHERE invoice_id = ?",
      args: [invoiceId],
>>>>>>> emailReader
    });
    const itemsRows = itemsResult.rows as InvoiceItem[];
    return {
      invoice,
<<<<<<< HEAD
      items: itemsRows
    };
  } catch (error) {
    console.error('Error fetching invoice with items:', error);
=======
      items: itemsRows,
    };
  } catch (error) {
    console.error("Error fetching invoice with items:", error);
>>>>>>> emailReader
    return null;
  }
}

export async function getCompanyConfig() {
  try {
<<<<<<< HEAD
    const result = await client.execute('SELECT * FROM company LIMIT 1');
=======
    const result = await client.execute("SELECT * FROM company LIMIT 1");
>>>>>>> emailReader
    const rows = Array.isArray(result.rows) ? (result.rows as any[]) : [];
    if (rows.length > 0) {
      // Convert RowDataPacket to plain object if needed
      const row = rows[0];
<<<<<<< HEAD
      const plain = typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
=======
      const plain =
        typeof row.toJSON === "function" ? row.toJSON() : { ...row };
>>>>>>> emailReader
      // Map company_logo to logo for template compatibility
      if (plain.company_logo && !plain.logo) plain.logo = plain.company_logo;
      return plain;
    }
    return null;
  } catch (error) {
<<<<<<< HEAD
    console.error('Error fetching company config:', error);
=======
    console.error("Error fetching company config:", error);
>>>>>>> emailReader
    return null;
  }
}

export async function getBankDetails() {
  try {
<<<<<<< HEAD
    const result = await client.execute('SELECT * FROM bank_details LIMIT 1');
    const rows = Array.isArray(result.rows) ? (result.rows as any[]) : [];
    if (rows.length > 0) {
      const row = rows[0];
      const plain = typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
=======
    const result = await client.execute("SELECT * FROM bank_details LIMIT 1");
    const rows = Array.isArray(result.rows) ? (result.rows as any[]) : [];
    if (rows.length > 0) {
      const row = rows[0];
      const plain =
        typeof row.toJSON === "function" ? row.toJSON() : { ...row };
>>>>>>> emailReader
      return plain;
    }
    return null;
  } catch (error) {
<<<<<<< HEAD
    console.error('Error fetching bank details:', error);
=======
    console.error("Error fetching bank details:", error);
>>>>>>> emailReader
    return null;
  }
}

export async function updateCompanyConfig(data: any) {
  try {
    const existing = await getCompanyConfig();

    if (existing) {
      await client.execute({
        sql: `UPDATE company SET name = ?, address = ?, email = ?, contact = ?, admin_name = ?, admin_department = ?, company_logo = ?, hsn_sac = ? WHERE id = ?`,
<<<<<<< HEAD
        args: [data.name, data.address, data.email, data.contact, data.admin_name, data.admin_department, data.company_logo, data.hsn_sac, existing.id]
=======
        args: [
          data.name,
          data.address,
          data.email,
          data.contact,
          data.admin_name,
          data.admin_department,
          data.company_logo,
          data.hsn_sac,
          existing.id,
        ],
>>>>>>> emailReader
      });
    } else {
      await client.execute({
        sql: `INSERT INTO company (name, address, email, contact, admin_name, admin_department, company_logo, hsn_sac) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
<<<<<<< HEAD
        args: [data.name, data.address, data.email, data.contact, data.admin_name, data.admin_department, data.company_logo, data.hsn_sac]
      });
    }
  } catch (error) {
    console.error('Error updating company config:', error);
=======
        args: [
          data.name,
          data.address,
          data.email,
          data.contact,
          data.admin_name,
          data.admin_department,
          data.company_logo,
          data.hsn_sac,
        ],
      });
    }
  } catch (error) {
    console.error("Error updating company config:", error);
>>>>>>> emailReader
    throw error;
  }
}

export async function updateBankDetails(data: any) {
  try {
    const existing = await getBankDetails();

    if (existing) {
      await client.execute({
        sql: `UPDATE bank_details SET account_number = ?, bank_name = ?, bank_address = ?, swift_code = ?, ifsc_code = ?, wire_charges = ? WHERE id = ?`,
<<<<<<< HEAD
        args: [data.account_number, data.bank_name, data.bank_address, data.swift_code, data.ifsc_code, data.wire_charges, existing.id]
=======
        args: [
          data.account_number,
          data.bank_name,
          data.bank_address,
          data.swift_code,
          data.ifsc_code,
          data.wire_charges,
          existing.id,
        ],
>>>>>>> emailReader
      });
    } else {
      await client.execute({
        sql: `INSERT INTO bank_details (account_number, bank_name, bank_address, swift_code, ifsc_code, wire_charges) VALUES (?, ?, ?, ?, ?, ?)`,
<<<<<<< HEAD
        args: [data.account_number, data.bank_name, data.bank_address, data.swift_code, data.ifsc_code, data.wire_charges]
      });
    }
  } catch (error) {
    console.error('Error updating bank details:', error);
=======
        args: [
          data.account_number,
          data.bank_name,
          data.bank_address,
          data.swift_code,
          data.ifsc_code,
          data.wire_charges,
        ],
      });
    }
  } catch (error) {
    console.error("Error updating bank details:", error);
>>>>>>> emailReader
    throw error;
  }
}

<<<<<<< HEAD
// In PDF generation, use company.company_logo as logo path if present
=======
// In PDF generation, use company.company_logo as logo path if present
>>>>>>> emailReader
