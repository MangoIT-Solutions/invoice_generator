import { extractSenderAndBody } from "../server/email";

// Parses the email to extract invoice creation payload:
export async function parseEmailContentForCreating(
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
    client_name: "",
    client_address: "",
    client_email: "",
    invoice_date: new Date().toISOString().split("T")[0],
    Date_range: "",
    term: "",
    project_code: "",
    payment_charges: 0,
    items: [],
    senderEmail: senderEmail,
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

  let isItemSection = false;

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.startsWith("client name:")) {
      payload.client_name = getValue(line, "Client Name");
    } else if (lower.startsWith("client address:")) {
      payload.client_address = getValue(line, "Client Address");
    } else if (lower.startsWith("client email:")) {
      payload.client_email = getValue(line, "Client Email");
    } else if (lower.startsWith("invoice date:")) {
      payload.invoice_date = getValue(line, "Invoice Date");
    } else if (lower.startsWith("project code:")) {
      payload.project_code = getValue(line, "Project Code");
    } else if (lower.startsWith("term:")) {
      payload.term = getValue(line, "Term");
    } else if (lower.startsWith("date range:")) {
      payload.Date_range = getValue(line, "Date Range");
    } else if (lower.startsWith("include transfer charges:")) {
      const val = getValue(line, "Include Transfer Charges").toLowerCase();
      if (val === "yes") payload.payment_charges = 35;
    } else if (lower.startsWith("items:")) {
      isItemSection = true;
    } else if (isItemSection && lower.startsWith("- description:")) {
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
        } else {
          throw new Error(`Invalid item values in line: ${line}`);
        }
      } else {
        throw new Error(`Invalid item format in line: ${line}`);
      }
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
    total: 0,
    total_amount: 0,
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

        // Accumulate total
        payload.total += amount;
      }
    }
  }
  if (!payload.invoice_number) {
    throw new Error("Missing Invoice Number for update");
  }
  // Add transfer charges (if any) to total_amount
  payload.total_amount = payload.total + (payload.payment_charges || 0);
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
