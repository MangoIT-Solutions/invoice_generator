// lib/parseInvoiceText.ts
interface ParsedInvoiceData {
  client_name: string;
  term: string;
  period: string;
  item_description: string;
  item_amount: string;
  project_code?: string;
}

export default function parseInvoiceText(text: unknown): ParsedInvoiceData {
  const result: ParsedInvoiceData = {
    client_name: "",
    term: "",
    period: "",
    item_description: "",
    item_amount: "",
    project_code: "",
  };

  // Check if text is a string
  if (typeof text !== "string" || !text) {
    console.error("parseInvoiceText: Invalid text input:", text);
    return result;
  }

  const lines = text.split("\n");
  for (const line of lines) {
    const [key, value] = line.split(":").map((s) => s.trim());
    if (key && value) {
      if (key.toLowerCase() === "client name") result.client_name = value;
      if (key.toLowerCase() === "term") result.term = value;
      if (key.toLowerCase() === "period") result.period = value;
      if (key.toLowerCase() === "item description")
        result.item_description = value;
      if (key.toLowerCase() === "item amount") result.item_amount = value;
      if (key.toLowerCase() === "project code") result.project_code = value;
    }
  }

  return result;
}
