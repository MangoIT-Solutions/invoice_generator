// services/bank.service.ts
import { BankDetails } from "@/database/models/bank-details.model";
import { Invoice } from "@/database/models/invoice.model";
import InvoicePayment from "@/database/models/invoice_payment.model";
import Config from "@/database/models/config.model";
import { readBankEmails } from "@/lib/server/gmail/gmail.service";

export async function getBankDetails() {
  try {
    const result = await BankDetails.findOne();
    if (result) {
      const plain = result.toJSON?.() || result;
      return plain;
    }
    return null;
  } catch (error) {
    console.error("Error fetching bank details:", error);
    return null;
  }
}

export async function updateBankDetails(data: any) {
  try {
    const existing = await getBankDetails();

    if (existing) {
      await BankDetails.update(
        {
          account_number: data.account_number,
          bank_name: data.bank_name,
          bank_address: data.bank_address,
          swift_code: data.swift_code,
          ifsc_code: data.ifsc_code,
          wire_charges: data.wire_charges,
        },
        {
          where: { id: existing.id },
        }
      );
    } else {
      await BankDetails.create({
        account_number: data.account_number,
        bank_name: data.bank_name,
        bank_address: data.bank_address,
        swift_code: data.swift_code,
        ifsc_code: data.ifsc_code,
        wire_charges: data.wire_charges,
      });
    }
  } catch (error) {
    console.error("Error updating bank details:", error);
    throw error;
  }
}

export async function processBankMail() {
  try {
    const parsedBankMails = await readBankEmails();
    const results = [];

    const marginConfig = await Config.findOne({
      where: { keyIndex: "marginAmountForUnduePayment" },
    });

    if (!marginConfig) {
      throw new Error("Config for marginAmountForUnduePayment not found");
    }

    const allowedMargin = Number(marginConfig.value);

    for (const emailData of parsedBankMails) {
      if (emailData.type !== "bank_mail") continue;

      const payload = emailData.payload;
      if (!payload) continue;

      const invoiceNumber = payload.invoice_number;
      const amountReceived = parseFloat(payload.amount);
      const transactionId = payload.transaction_id || null;

      if (!invoiceNumber || isNaN(amountReceived)) {
        console.warn("Invalid email data:", emailData);
        continue;
      }

      const existingInvoice = await Invoice.findOne({
        where: { invoice_number: invoiceNumber },
      });

      if (!existingInvoice) {
        console.warn(`Invoice not found for number: ${invoiceNumber}`);
        continue;
      }

      const total = Number(existingInvoice.total);
      const margin = amountReceived - total;
      const isFullyPaid = margin >= -allowedMargin;

      // Save to invoice_payment table
      await InvoicePayment.create({
        invoice_id: existingInvoice.id,
        amount: amountReceived,
        transaction_id: transactionId,
        date: new Date(),
      });

      // Update invoice status
      await existingInvoice.update({
        status: isFullyPaid ? "fully_paid" : "partially_paid",
      });

      if (!isFullyPaid) {
        console.warn(
          `Invoice ${invoiceNumber} is not fully paid. Margin: ₹${margin}`
        );
      }

      results.push({
        invoice_id: existingInvoice.id,
        margin,
        partially_paid: !isFullyPaid,
      });
    }
    return results;
  } catch (error) {
    console.error("Error processing bank mail:", error);
    throw error;
  }
}
