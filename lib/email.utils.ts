import { gmail_v1 } from "googleapis";
import { simpleParser } from "mailparser";
import path from "path";

type EmailType = "normal" | "reminder" | "recurring";

export async function extractSenderAndBody(rawBase64: string): Promise<{
  senderEmail: string;
  bodyText: string;
}> {
  const parsed = await simpleParser(Buffer.from(rawBase64, "base64"));
  const senderEmail = parsed.from?.text || "";
  const bodyText = parsed.text || "";

  return { senderEmail, bodyText };
}

export async function markEmailAsRead(
  gmail: gmail_v1.Gmail,
  messageId: string
) {
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: {
      removeLabelIds: ["UNREAD"],
    },
  });
}

export function getInvoicePdfPaths(invoiceNumber: number) {
  const fileName = `invoice-${invoiceNumber}.pdf`;
  const filePath = path.join(process.cwd(), "public", "invoices", fileName);
  return { fileName, filePath };
}

export function getInvoiceEmailContent(
  type: EmailType,
  invoice: {
    invoice_number: number;
    client_name?: string;
    client_email?: string;
    total?: number;
    total_amount?: number;
  }
) {
  const invoiceNumber = invoice.invoice_number;
  const total = invoice.total || invoice.total_amount || "N/A";

  if (type === "reminder") {
    return {
      subject: `⏰ Payment Reminder: Invoice #${invoiceNumber}`,
      message: `This is a friendly reminder to complete your payment for Invoice #${invoiceNumber}.\n\nThank you.`,
    };
  }

  if (type === "recurring") {
    return {
      subject: `📄 Recurring Invoice #${invoiceNumber} - Mango IT Solutions`,
      message: `Dear ${invoice.client_name},\n\nPlease find attached your recurring invoice #${invoiceNumber}.\n\nTotal Amount: ₹${total}\n\nThanks.`,
    };
  }

  // Default: normal invoice
  return {
    subject: `📄 Your Invoice #${invoiceNumber} from Mango IT Solutions`,
    message: `Invoice #${invoiceNumber} attached.\nTotal: ₹${total}`,
  };
}
