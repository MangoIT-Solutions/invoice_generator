"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
// Use browser crypto for unique IDs; avoids external `uuid` dependency
const genId = (): string => (typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2));
import clsx from "clsx";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  actions?: {
    downloadUrl?: string;
    invoiceId?: number;
    askEmail?: boolean;
  };
}

/**
 * InvoiceChatbot – embeddable React component that talks to
 * `/api/chat/invoice-bot`.
 *
 * NOTE: deliberately minimal styling so it blends with existing Tailwind config.
 */

export default function InvoiceChatbot({
  apiPath = "/api/chat/invoice-bot",
  className,
}: {
  apiPath?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const greetedRef = useRef(false);
  const [sessionId] = useState(() => genId());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim()) return;

    const userMsg: Message = { id: genId(), sender: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text }),
      });
      if (!res.ok) throw new Error("Chat API error");
      const data = await res.json();
      const botMsg: Message = { id: genId(), sender: "bot", text: data.reply, actions: data.actions };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      const botMsg: Message = {
        id: genId(),
        sender: "bot",
        text: "Sorry, something went wrong. Please try again.",
      };
      setMessages((prev) => [...prev, botMsg]);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // When widget is opened for the first time, push greeting
  useEffect(() => {
    if (open && !greetedRef.current) {
      setMessages([{ id: genId(), sender: 'bot', text: 'Hi! Please provide the project code to start generating the invoice.' }]);
      greetedRef.current = true;
    }
  }, [open]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={clsx(
          "fixed bottom-6 right-6 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg",
          className
        )}
      >
        Chatbot
      </button>
    );
  }

  return (
    <div className={clsx("fixed bottom-6 right-6 w-80 h-96 bg-white shadow-xl border rounded-xl flex flex-col", className)}>
      <div className="p-3 border-b flex justify-between items-center bg-primary text-primary-foreground rounded-t-xl">
        <span>Invoice Chatbot</span>
        <button onClick={() => setOpen(false)} aria-label="Close">✕</button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
        {messages.map((m) => (
          <div
            key={m.id}
            className={clsx(
              "px-3 py-2 rounded-lg max-w-[75%] whitespace-pre-line",
              m.sender === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "mr-auto bg-gray-100 text-gray-800"
            )}
          >
            {m.text}
            {m.sender === 'bot' && m.actions?.downloadUrl && (
              <div className="mt-2 flex gap-2 items-center">
                <a
                  href={m.actions.downloadUrl}
                  target="_blank"
                  className="text-primary underline text-xs"
                  rel="noopener noreferrer"
                >
                  Download PDF
                </a>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border rounded px-2 py-1 text-sm"
          placeholder="Type your message..."
        />
        <button
          type="submit"
          className="p-2 text-primary disabled:opacity-50"
          disabled={!input.trim()}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
