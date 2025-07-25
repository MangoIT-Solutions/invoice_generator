import { extractSenderAndBody } from "../gmail/gmail.utils";

// Parses the email to extract update actions:
export async function parseEmailContentForUpdating(
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
    invoice_number: "",
    user_id: userId,
    client_name: "",
    client_address: "",
    client_email: "",
    invoice_date: new Date().toISOString().split("T")[0],
    Date_range: "",
    term: "",
    project_code: "",
    payment_charges: undefined,
    items: {
      add: [],
      remove: [],
      replace: [],
    },
    senderEmail,
  };

  const getValue = (str: string, fieldName = "Unknown") => {
    const parts = str.split(":");
    if (parts.length < 2) throw new Error(`Missing ':' for ${fieldName}`);
    const value = parts.slice(1).join(":").trim();
    if (!value) throw new Error(`Empty value for ${fieldName}`);
    return value;
  };

  let isItemSection = false;

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.startsWith("invoice number:")) {
      payload.invoice_number = getValue(line, "Invoice Number");
    } else if (lower.startsWith("client name:")) {
      payload.client_name = getValue(line, "Client Name");
    } else if (lower.startsWith("client address:")) {
      payload.client_address = getValue(line, "Client Address");
    } else if (lower.startsWith("client email:")) {
      payload.client_email = getValue(line, "Client Email");
    } else if (lower.startsWith("invoice date:")) {
      const rawDate = getValue(line, "Invoice Date");
      const [day, month, year] = rawDate.split("/");
      if (!day || !month || !year) {
        throw new Error(`Invalid Invoice Date format: ${rawDate}`);
      }
      payload.invoice_date = `${year}-${month}-${day}`;
    } else if (lower.startsWith("project code:")) {
      payload.project_code = getValue(line, "Project Code");
    } else if (lower.startsWith("term:")) {
      payload.term = getValue(line, "Term");
    } else if (lower.startsWith("date range:")) {
      payload.Date_range = getValue(line, "Date Range");
    } else if (lower.startsWith("include transfer charges:")) {
      const val = getValue(line, "Include Transfer Charges").toLowerCase();
      payload.payment_charges = val === "yes" ? 35 : 0;
    } else if (lower.startsWith("items:")) {
      isItemSection = true;
    } else if (isItemSection && lower.startsWith("- action:")) {
      const actionMatch = line.match(/action:\s*(add|remove|replace)/i);
      const descMatch = line.match(/description:\s*([^,]+)/i);
      const rateMatch = line.match(/base rate:\s*([\d.]+)/i);
      const unitMatch = line.match(/unit:\s*([\d.]+)/i);
      const amountMatch = line.match(/amount:\s*([\d.]+)/i);

      const action = actionMatch?.[1]?.toLowerCase();
      const description = descMatch?.[1]?.trim();

      if (!action || !description) {
        throw new Error(`Invalid item action or description in line: ${line}`);
      }

      if (action === "remove") {
        payload.items.remove.push(description);
      } else {
        if (
          !rateMatch ||
          !unitMatch ||
          isNaN(parseFloat(rateMatch[1])) ||
          isNaN(parseFloat(unitMatch[1]))
        ) {
          throw new Error(`Missing base rate or unit in line: ${line}`);
        }

        const base_rate = parseFloat(rateMatch[1]);
        const unit = parseFloat(unitMatch[1]);

        // Calculate amount if not provided
        let amount = base_rate * unit;
        if (amountMatch && !isNaN(parseFloat(amountMatch[1]))) {
          amount = parseFloat(amountMatch[1]);
        }

        const item = { description, base_rate, unit, amount };

        if (action === "add") {
          payload.items.add.push(item);
        } else if (action === "replace") {
          payload.items.replace.push(item);
        }
      }
    }
  }

  if (!payload.invoice_number) {
    throw new Error("Missing Invoice Number for update");
  }

  return payload;
}
