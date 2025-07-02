export async function parseInvoiceFromText(
  emailText: string,
  senderEmail: string,
  userId: number
) {
  const lines = emailText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  console.log("Automate User ID:", userId);

  const payload: any = {
    user_id: userId,
    client_name: "",
    client_company_name: "",
    client_address: "",
    client_email: senderEmail || "",
    invoice_date: new Date().toISOString().split("T")[0],
    period: "",
    term: "",
    project_code: "",
    payment_charges: 0,
    items: [],
  };

  for (const line of lines) {
    const lower = line.toLowerCase();

    const getValue = (str: string): string => {
      const parts = str.split(":");
      if (parts.length < 2) return "";
      return parts.slice(1).join(":").trim(); // in case there's ":" in value
    };

    if (lower.startsWith("client name:")) {
      const value = getValue(line);
      if (value) payload.client_name = value;
    } else if (lower.startsWith("client company name:")) {
      const value = getValue(line);
      if (value) payload.client_company_name = value;
    } else if (lower.startsWith("client address:")) {
      const value = getValue(line);
      if (value) payload.client_address = value;
    } else if (lower.startsWith("client email:")) {
      const value = getValue(line);
      if (value) payload.client_email = value;
    } else if (lower.startsWith("invoice date:")) {
      const value = getValue(line);
      if (value) payload.invoice_date = value;
    } else if (lower.startsWith("period:")) {
      const value = getValue(line);
      if (value) payload.period = value;
    } else if (lower.startsWith("term:")) {
      const value = getValue(line);
      if (value) payload.term = value;
    } else if (lower.startsWith("project code:")) {
      const value = getValue(line);
      if (value) payload.project_code = value;
    } else if (lower.startsWith("payment charges:")) {
      const value = getValue(line);
      const charge = Number(value);
      if (!isNaN(charge) && charge >= 0) payload.payment_charges = charge;
    } else if (lower.startsWith("item:")) {
      const match = line.match(/item:\s*(.*?)\s*\|\s*(\d+)\s*\|\s*([\d.]+)/i);
      if (match) {
        const [, desc, unit, rate] = match;
        const unitNum = Number(unit);
        const rateNum = Number(rate);
        if (desc && unitNum > 0 && rateNum > 0) {
          payload.items.push({
            description: desc.trim(),
            unit: unitNum,
            base_rate: rateNum,
            amount: unitNum * rateNum,
          });
        }
      }
    }
  }

  // Required field validation
  const requiredFields = [
    "client_name",
    "client_address",
    "client_email",
    "invoice_date",
    "term",
    "project_code",
    "period",
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
