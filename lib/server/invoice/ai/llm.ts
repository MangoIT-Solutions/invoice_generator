import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { MessageContent } from "@langchain/core/messages";

/**
 * Returns a singleton Gemini chat model with sane defaults.
 */
export function getGeminiModel() {
  // In practice you might want to cache this instance.
  return new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY!,
    model: process.env.GEMINI_MODEL_ID ?? "gemini-2.5-flash",
    temperature: 0,
  });
}

/**
 * LangChain responses sometimes return an array of content parts instead of a
 * plain string. This utility flattens either form into a single string.
 */
export function extractText(content: MessageContent): string {
  if (typeof content === "string") return content;
  return (content as any[])
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join("\n");
}
