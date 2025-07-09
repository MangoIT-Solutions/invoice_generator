import { extractSenderAndBody } from "./utilsServer";

export async function parseInvoiceFromText(
  rawBase64Data: string,
  userId: number
) {
  const { senderEmail, bodyText } = await extractSenderAndBody(rawBase64Data);

  const lines = bodyText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const payload: any = {
    user_id: userId,
    client_name: "",
    client_address: "",
    client_email: "",
    invoice_date: new Date().toISOString().split("T")[0],
    Date_range: "",
    term: "",
    project_code: "",
    payment_charges: 0,
    items: [],
    senderEmail: senderEmail
  };

  const getValue = (str: string): string => {
    const parts = str.split(":");
    if (parts.length < 2) return "";
    return parts.slice(1).join(":").trim();
  };

  let isItemSection = false;

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.startsWith("client name:")) {
      payload.client_name = getValue(line);
    } else if (lower.startsWith("client address:")) {
      payload.client_address = getValue(line);
    } else if (lower.startsWith("client email:")) {
      payload.client_email = getValue(line);
    } else if (lower.startsWith("invoice date:")) {
      payload.invoice_date = getValue(line);
    } else if (lower.startsWith("project code:")) {
      payload.project_code = getValue(line);
    } else if (lower.startsWith("term:")) {
      payload.term = getValue(line);
    } else if (lower.startsWith("date range:")) {
      payload.Date_range = getValue(line);
    } else if (lower.startsWith("include transfer charges:")) {
      const val = getValue(line).toLowerCase();
      if (val === "yes") payload.payment_charges = 35;
    } else if (lower.startsWith("items:")) {
      isItemSection = true;
    } else if (isItemSection && lower.startsWith("- description:")) {
      // - Description: Website Design, Base Rate: 100.00, Unit: 5.5, Amount: 550.00
      const descMatch = line.match(/description:\s*(.*?),/i);
      const rateMatch = line.match(/base rate:\s*([\d.]+)/i);
      const unitMatch = line.match(/unit:\s*([\d.]+)/i);
      const amountMatch = line.match(/amount:\s*([\d.]+)/i);

      if (descMatch && rateMatch && unitMatch && amountMatch) {
        const description = descMatch[1].trim();
        const base_rate = parseFloat(rateMatch[1]);
        const unit = parseFloat(unitMatch[1]);
        const amount = parseFloat(amountMatch[1]);

        if (
          description &&
          !isNaN(base_rate) &&
          !isNaN(unit) &&
          !isNaN(amount)
        ) {
          payload.items.push({ description, base_rate, unit, amount });
        }
      }
    }
  }

  // Validate required fields
  const requiredFields = [
    "client_name",
    "client_address",
    "client_email",
    "invoice_date",
    "term",
    "project_code",
    "Date_range",
    "payment_charges",
  ];

  for (const field of requiredFields) {
    if (!payload[field] || payload[field].toString().trim().length === 0) {
      throw new Error(`Missing or invalid field: ${field}`);
    }
  }

  if (!payload.items.length) {
    throw new Error("Invoice must contain at least one valid item");
  }

  payload.subtotal = payload.items.reduce(
    (sum: number, item: any) => sum + item.amount,
    0
  );
  payload.total = payload.subtotal + (payload.payment_charges || 0);
  payload.status = "draft";

  return payload;
}
