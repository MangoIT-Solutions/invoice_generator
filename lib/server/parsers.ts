import { parseInvoiceUpdateEmail } from "../invoiceUpdateParser";
import { parseInvoiceCreateEmail } from "../invoiceCreateParser";
import { computeAmount, calculatePaymentCharges } from "./invoice/helpers";
import { extractSenderAndBody } from "../server/email";
import { parseInvoiceDate } from "../utils";

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
    period: keyMap.date_range || "",
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
    status: "sent",
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

export function prepareInvoiceCreatePayload(
  aiResponse: {
    clientName?: string;
    clientEmail?: string;
    clientAddress?: string;
    clientCompanyName?: string;
    projectCode?: string;
    invoiceDate?: string;
    dateRange?: string;
    includeTransferCharges?: string | boolean;
    term?: string;
    recurringInterval?: string | null;
    items: Array<{
      description: string;
      baseRate: number;
      unit: number;
      amount?: number;
    }>;
  },
  userId: number,
  senderEmail: string
) {
  // calculate transfer fee via helper
  const paymentCharges = calculatePaymentCharges(aiResponse.includeTransferCharges);

  const payload: any = {
    user_id: userId,
    senderEmail,
    client_name: aiResponse.clientName ?? "",
    client_email: aiResponse.clientEmail ?? "",
    client_company_name: aiResponse.clientCompanyName ?? "",
    client_address: aiResponse.clientAddress ?? "",
    project_code: aiResponse.projectCode ?? "",
    invoice_date: (() => {
      if (!aiResponse.invoiceDate)
        return new Date().toISOString().split("T")[0];
      return parseInvoiceDate(aiResponse.invoiceDate);
    })(),
    period: aiResponse.dateRange ?? "",
    term: aiResponse.term ?? "",
    recurring_interval: aiResponse.recurringInterval ?? null,
    payment_charges: paymentCharges,
    items: [],
    subtotal: 0,
    total: 0,
    status: "sent",
  };

  let subtotal = 0;
  for (const i of aiResponse.items) {
    const amount = computeAmount(i.baseRate, i.unit, i.amount);
    payload.items.push({
      description: i.description,
      base_rate: i.baseRate,
      unit: i.unit,
      amount,
    });
    subtotal += amount;
  }

  payload.subtotal = subtotal;
  payload.total = subtotal + paymentCharges;

  return payload;
}

export async function extractInvoiceCreateFromEmail(
  rawBase64Data: string,
  userId: number
) {
  const { senderEmail, bodyText } = await extractSenderAndBody(rawBase64Data);

  if (!bodyText || !senderEmail) {
    throw new Error("No body text or Email found in email");
  }

  // Obtain structured info using Gemini
  const structured = await parseInvoiceCreateEmail(bodyText);

  // Transform into internal payload format
  return prepareInvoiceCreatePayload(structured, userId, senderEmail);
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
    status: (() => {
      const statusRaw = keyMap.status?.toLowerCase();
      const validStatuses = ["draft", "sent", "fully_paid", "partially_paid"];
      return validStatuses.includes(statusRaw) ? statusRaw : "sent";
    })(),
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

export function prepareInvoiceUpdatePayload(
  aiResponse: {
    invoiceNumber: number;
    updates: Array<{
      action: string;
      field?: string;
      value?: string | number;
      baseRate?: number;
      unit?: number;
      amount?: number;
      description?: string;
    }>;
  },
  userId: number,
  senderEmail: string
) {
  const payload: any = {
    invoice_number: aiResponse.invoiceNumber,
    user_id: userId,
    senderEmail,
    items: { add: [], remove: [], replace: [] },
  };

  let subtotal = 0;

  for (const update of aiResponse.updates) {
    const action = update.action?.toLowerCase();
    const field = update.field?.toLowerCase();

    switch (action) {
      // ----------- FIELD UPDATES -----------
      case "update":
        if (!field || update.value === undefined) break;

        const stringValue = String(update.value).trim();

        const fieldMap: Record<string, (val: string) => void> = {
          clientname: (v) => (payload.client_name = v),
          clientcompanyname: (v) => (payload.client_company_name = v),
          clientemail: (v) => (payload.client_email = v),
          clientaddress: (v) => (payload.client_address = v),
          invoicedate: (v) => (payload.invoice_date = parseInvoiceDate(v)),
          daterange: (v) => (payload.period = v),
          term: (v) => (payload.term = v),
          projectcode: (v) => (payload.project_code = v),
          transfercharges: (v) =>
          (payload.payment_charges = [
            "yes",
            "true",
            "1",
            "include",
            "included",
          ].includes(v.toLowerCase())
            ? 35
            : 0),
          status: (v) => (payload.status = v.toLowerCase()),
        };

        if (fieldMap[field]) fieldMap[field](stringValue);
        break;

      // ----------- REMOVE ITEM -----------
      case "removeitem":
        if (update.description || update.value) {
          payload.items.remove.push(String(update.description ?? update.value));
        }
        break;

      // ----------- ADD / UPDATE ITEM -----------
      case "additem":
      case "updateitem": {
        if (!update.description && !update.value) break;
        const item = {
          description: update.description ?? String(update.value),
          base_rate: update.baseRate,
          unit: update.unit,
          amount: computeAmount(update.baseRate, update.unit, update.amount),
        };
        payload.items[action === "additem" ? "add" : "replace"].push(item);
        if (item.amount) subtotal += item.amount;
        break;
      }

      default:
        console.warn(`Unknown action: ${update.action}`);
    }
  }

  if (subtotal > 0) payload.subtotal = subtotal;

  payload.total = (payload.subtotal || 0) + (payload.payment_charges || 0);

  return payload;
}

export async function extractInvoiceUpdateFromEmail(
  rawBase64Data: string,
  userId: number
) {
  const { senderEmail, bodyText } = await extractSenderAndBody(rawBase64Data);

  if (!bodyText || !senderEmail) {
    throw new Error("No body text or Email found in email");
  }

  // Get structured update info from AI (Gemini)
  const structured = await parseInvoiceUpdateEmail(bodyText);

  // Convert AI structured response into your final invoice payload
  const result = await prepareInvoiceUpdatePayload(
    structured,
    userId,
    senderEmail
  );

  return result;
}
