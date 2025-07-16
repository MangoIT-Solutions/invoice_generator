"use client";
import dynamic from "next/dynamic";
import InvoiceChatbot from "./InvoiceChatbot";

// Dynamically import to ensure nothing breaks during SSR

export default function ChatbotPortal() {
  return <InvoiceChatbot />;
}
