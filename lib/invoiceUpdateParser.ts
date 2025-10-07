import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import type { MessageContent } from "@langchain/core/messages";

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

function extractText(content: MessageContent): string {
  if (typeof content === "string") {
    return content;
  }

  return content
    .filter(
      (part: any) => part.type === "text" && typeof part.text === "string"
    )
    .map((part: any) => part.text)
    .join("\n");
}

export async function parseInvoiceUpdateEmail(emailContent: string) {
  // Initialize Gemini through LangChain
  const model = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY!,
    model: "gemini-2.5-flash", // or "gemini-1.5-flash" for faster/cheaper
    temperature: 0,
  });

  // Create a parser from Zod schema
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
