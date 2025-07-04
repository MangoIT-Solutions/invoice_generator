import { NextRequest, NextResponse } from "next/server";
import { InvoiceAssistant } from "@/lib/invoiceAssistant";

// Simple in-memory store for assistant sessions
const assistantSessions = new Map<string, InvoiceAssistant>();

export async function POST(req: NextRequest) {
  try {
    const { sessionId, message } = await req.json();
    
    if (!sessionId || !message) {
      return NextResponse.json(
        { error: "Missing sessionId or message" }, 
        { status: 400 }
      );
    }

    // Get or create assistant instance for this session
    if (!assistantSessions.has(sessionId)) {
      assistantSessions.set(sessionId, new InvoiceAssistant());
    }
    const assistant = assistantSessions.get(sessionId)!;

    // Process the message
    const { reply, state } = await assistant.processMessage(message);

    // Clean up completed sessions
    if (state.step === 'complete') {
      assistantSessions.delete(sessionId);
    }

    return NextResponse.json({
      reply,
      state: state.step,
      isComplete: state.step === 'complete'
    });

  } catch (error) {
    console.error('Error processing message:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your message' },
      { status: 500 }
    );
  }
}
