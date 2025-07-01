"use client";
import dynamic from "next/dynamic";

// Dynamically import to ensure nothing breaks during SSR
const InvoiceChatbot = dynamic(() => import("./InvoiceChatbot"), { ssr: false });

export default function ChatbotPortal() {
  return <InvoiceChatbot />;
}
