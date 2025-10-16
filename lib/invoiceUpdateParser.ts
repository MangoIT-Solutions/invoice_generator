import { z } from "zod";
import { getGeminiModel, extractText } from "./server/invoice/ai/llm";
import { StructuredOutputParser } from "@langchain/core/output_parsers";

const updateSchema = z.object({
  invoiceNumber: z.number(),
  updates: z.array(
    z.object({
      action: z.enum(["update", "removeItem", "addItem", "updateItem"]),
      field: z.string().optional(),
      description: z.string().optional(),
      value: z.union([z.string(), z.number()]).optional(),
      baseRate: z.number().optional(),
      unit: z.number().optional(),
      amount: z.number().optional(),
    })
  ),
});

export async function parseInvoiceUpdateEmail(emailContent: string) {
  const model = getGeminiModel();

  const parser = StructuredOutputParser.fromZodSchema(updateSchema);

  const prompt = `
  Extract invoice update operations from the following email:

  Email:
  """${emailContent}"""

  Output JSON only, matching this schema:
  ${parser.getFormatInstructions()}
  `;

  const response = await model.invoke(prompt);

  const textOutput = extractText(response.content);

  return parser.parse(textOutput);
}

// Example usage
// (async () => {
//   const email = `
//     Update invoice 1000. Change client email to xyz@mail.com.
//     Remove item Mob Dev. Add item API Development with Base Rate 200 and 5 units.
//   `;

//   const structured = await parseInvoiceUpdateEmail(email);
//   console.log(JSON.stringify(structured, null, 2));
// })();
