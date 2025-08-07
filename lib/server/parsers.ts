import { extractSenderAndBody } from "../server/email";

// Parses key-value lines from the email body into an object
export function parseKeyValueLines(lines: string[]): Record<string, string> {
  const result: Record<string, string> = {};

  for (const line of lines) {
    const [rawKey, ...rest] = line.split(":");
    if (!rawKey || rest.length === 0) continue;

    const key = rawKey.trim().toLowerCase().replace(/\s+/g, "_");
    const value = rest.join(":").trim();

    if (key && value) result[key] = value;
  }

  return result;
}

// Parses the email to extract invoice creation payload:
export async function parseEmailContentForCreating(
  rawBase64Data: string,
  userId: number
) {
  const { senderEmail, bodyText } = await extractSenderAndBody(rawBase64Data);
  console.log("Senders Email:", senderEmail);

  if (!bodyText || !senderEmail)
    throw new Error("No email body or sender email");

  const lines = bodyText
    .replace(/\[image:.*?\]/gi, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const keyMap = parseKeyValueLines(lines);

  const payload: any = {
    user_id: userId,
    senderEmail,
    client_name: keyMap.client_name || "",
    client_email: keyMap.client_email || "",
    client_address: keyMap.client_address || "",
    project_code: keyMap.project_code || "",
    invoice_date: keyMap.invoice_date || new Date().toISOString().split("T")[0],
    Date_range: keyMap.date_range || "",
    term: keyMap.term || "",
    recurring_interval: (() => {
      const recurringRaw = keyMap.recurring_term?.toLowerCase();
      const valid = ["once a month", "twice a month"];
      return valid.includes(recurringRaw) ? recurringRaw : null;
    })(),
    payment_charges:
      keyMap.include_transfer_charges?.toLowerCase() === "yes" ? 35 : 0,
    items: [],
    subtotal: 0,
    total: 0,
    status: "draft",
  };

  const itemStart = lines.findIndex((l) =>
    l.toLowerCase().startsWith("items:")
  );
  if (itemStart >= 0) {
    for (let i = itemStart + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.toLowerCase().startsWith("-")) continue;

      const descMatch = line.match(/description:\s*([^,]+)/i);
      const rateMatch = line.match(/base rate:\s*([\d.]+)/i);
      const unitMatch = line.match(/unit:\s*([\d.]+)/i);
      const amountMatch = line.match(/amount:\s*([\d.]+)/i);

      if (!descMatch || !rateMatch || !unitMatch) continue;

      const description = descMatch[1].trim();
      const base_rate = parseFloat(rateMatch[1]);
      const unit = parseFloat(unitMatch[1]);
      const amount = amountMatch?.[1]
        ? parseFloat(amountMatch[1])
        : base_rate * unit;

      if (!isNaN(base_rate) && !isNaN(unit) && !isNaN(amount)) {
        payload.items.push({ description, base_rate, unit, amount });
      }
    }
  }

  if (payload.items.length === 0) throw new Error("No valid items found");

  payload.subtotal = payload.items.reduce(
    (sum: number, i: any) => sum + i.amount,
    0
  );
  payload.total = payload.subtotal + payload.payment_charges;

  return payload;
}

// Parses the email to extract update actions:
export async function parseEmailContentForUpdating(
  rawBase64Data: string,
  userId: number
) {
  const { senderEmail, bodyText } = await extractSenderAndBody(rawBase64Data);
  if (!bodyText || !senderEmail)
    throw new Error("No body or sender email found");

  const lines = bodyText
    .replace(/\[image:.*?\]/gi, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const keyMap = parseKeyValueLines(lines);

  const payload: any = {
    invoice_number: keyMap.invoice_number || "",
    user_id: userId,
    client_name: keyMap.client_name || "",
    client_address: keyMap.client_address || "",
    client_email: keyMap.client_email || "",
    project_code: keyMap.project_code || "",
    term: keyMap.term || "",
    recurring_interval: (() => {
      const recurringRaw = keyMap.recurring_term?.toLowerCase();
      const validIntervals = ["once a month", "twice a month"];
      return validIntervals.includes(recurringRaw) ? recurringRaw : null;
    })(),
    Date_range: keyMap.date_range || "",
    payment_charges:
      keyMap.include_transfer_charges?.toLowerCase() === "yes" ? 35 : 0,
    invoice_date: (() => {
      const rawDate = keyMap.invoice_date;
      if (!rawDate) return new Date().toISOString().split("T")[0];
      const [day, month, year] = rawDate.split("/");
      return `${year}-${month}-${day}`;
    })(),
    total: 0,
    total_amount: 0,
    items: {
      add: [],
      remove: [],
      replace: [],
    },
    senderEmail,
  };

  const itemStart = lines.findIndex((l) =>
    l.toLowerCase().startsWith("items:")
  );
  if (itemStart >= 0) {
    for (let i = itemStart + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.toLowerCase().startsWith("-")) continue;

      const actionMatch = line.match(/action:\s*(add|remove|replace)/i);
      const descMatch = line.match(/description:\s*([^,]+)/i);
      const rateMatch = line.match(/base rate:\s*([\d.]+)/i);
      const unitMatch = line.match(/unit:\s*([\d.]+)/i);
      const amountMatch = line.match(/amount:\s*([\d.]+)/i);

      const action = actionMatch?.[1]?.toLowerCase();
      const description = descMatch?.[1]?.trim();

      if (!action || !description) continue;

      if (action === "remove") {
        payload.items.remove.push(description);
      } else {
        const base_rate = parseFloat(rateMatch?.[1] || "");
        const unit = parseFloat(unitMatch?.[1] || "");
        const amount = amountMatch?.[1]
          ? parseFloat(amountMatch[1])
          : base_rate * unit;

        if (!isNaN(base_rate) && !isNaN(unit) && !isNaN(amount)) {
          const item = { description, base_rate, unit, amount };
          payload.items[action].push(item);
          payload.total += amount;
        }
      }
    }
  }

  if (!payload.invoice_number) throw new Error("Missing Invoice Number");

  payload.total_amount = payload.total + payload.payment_charges;

  return payload;
}

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
