import { z } from "zod";
import { getGeminiModel, extractText } from "./server/invoice/ai/llm";
import { StructuredOutputParser } from "@langchain/core/output_parsers";

// Zod schema describing the structure we want to get back from Gemini
const createSchema = z.object({
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional(),
  clientAddress: z.string().optional(),
  clientCompanyName: z.string().optional(),
  projectCode: z.string().optional(),
  invoiceDate: z.string().optional(), // Expecting DD/MM/YYYY or YYYY-MM-DD
  dateRange: z.string().optional(),
  includeTransferCharges: z.union([
    z.boolean(),
    z.enum(["yes", "no", "true", "false", "1", "0"]),
  ]).optional(),
  term: z.string().optional(),
  recurringInterval: z
    .enum(["once a month", "twice a month"])
    .optional(),
  items: z
    .array(
      z.object({
        description: z.string(),
        baseRate: z.number(),
        unit: z.number(),
        amount: z.number().optional(),
      })
    )
    .min(1),
});

export async function parseInvoiceCreateEmail(emailContent: string) {
  const model = getGeminiModel();

  const parser = StructuredOutputParser.fromZodSchema(createSchema);

  const prompt = `You are an expert at extracting invoice details from emails.
  Convert the following email into the JSON format described below.
  Return ONLY valid JSON – no extra keys, markdown or commentary.

  Email: """${emailContent}"""

  ${parser.getFormatInstructions()}`;

  const response = await model.invoke(prompt);

  const textOutput = extractText(response.content);

  return parser.parse(textOutput);
}
