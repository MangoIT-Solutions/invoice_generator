import { extractSenderAndBody } from "../gmail/gmail.utils";

// Parses the body of a Gmail email to extract bank email fields:
export async function parseBankMailEmail(
  rawBase64Data: string,
  userId: number
) {
  const { senderEmail, bodyText } = await extractSenderAndBody(rawBase64Data);

  if (!bodyText || !senderEmail) {
    throw new Error("No body text or Email found in email");
  }

  const lines = bodyText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const payload: any = {
    user_id: userId,
    sender_email: senderEmail,
    invoice_number: "",
    transaction_id: "",
    amount: 0,
    payment_date: "",
    status: "unpaid",
  };

  const getValue = (str: string, fieldName: string = "Unknown"): string => {
    const parts = str.split(":");
    if (parts.length < 2) {
      throw new Error(`Missing ':' separator for ${fieldName}`);
    }
    const value = parts.slice(1).join(":").trim();
    if (!value) {
      throw new Error(`Empty value for required field: ${fieldName}`);
    }
    return value;
  };

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.startsWith("invoice number:")) {
      payload.invoice_number = getValue(line, "Invoice Number");
    } else if (lower.startsWith("transaction id:")) {
      payload.transaction_id = getValue(line, "Transaction ID");
    } else if (lower.startsWith("amount:")) {
      payload.amount = parseFloat(getValue(line, "Amount"));
    } else if (lower.startsWith("date:")) {
      payload.payment_date = getValue(line, "Date");
    }
  }

  // Final validation
  if (
    !payload.invoice_number ||
    !payload.transaction_id ||
    !payload.amount ||
    !payload.payment_date
  ) {
    throw new Error("Missing required payment reminder fields");
  }

  return payload;
}