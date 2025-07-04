// Invoice processing utilities with Ollama integration
// This module handles parsing work log entries and generating invoice data

// Simple in-memory cache for responses
const responseCache = new Map<string, any>();

// Core interfaces
export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount?: number;
}

export interface ParsedInvoiceInput {
  projectCode?: string;
  clientName?: string;
  period?: string;
  items: InvoiceItem[];
}

type WorkLogAction = 'log_work' | 'collect_email' | 'generate_invoice' | 'needs_info' | 'error';

export interface ProcessWorkLogResponse {
  action: WorkLogAction;
  data: any;
  message: string;
}

export interface WorkLogEntry {
  description: string;
  hours: number;
  rate: number;
  date?: string;
  projectCode?: string;
  clientName?: string;
  total?: number;
  features?: string[];
}

/**
 * Makes a request to the local Ollama API
 */
async function queryOllama(prompt: string): Promise<string> {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3',
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error querying Ollama:', error);
    throw error;
  }
}

/**
 * Extracts invoice details using AI
 */
async function extractInvoiceDetails(input: string): Promise<{
  projectCode?: string;
  clientName?: string;
  period: string;
  items: Array<{ description: string; quantity: number; rate: number }>;
}> {
  try {
    const prompt = `Extract invoice details from the following text:
    
    Input: ${input}
    
    Extract:
    1. Project Code (look for patterns like DI-XXX-### orUP-XXX-####, PROJ-####, or similar)
    2. Client name if mentioned
    3. Time period (look for patterns like DD-MM-YYYY to DD-MM-YYYY or MM/YYYY to MM/YYYY extract the period)
    4. Work items with description, quantity, and rate
    
    Return as JSON with this structure:
    {
      "projectCode": "string",
      "clientName": "string",
      "period": "string",
      "items": [{
        "description": "string",
        "quantity": number,
        "rate": number
      }]
    }`;

    const response = await queryOllama(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response as JSON');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Set default values if not provided
    if (!result.items || !Array.isArray(result.items) || result.items.length === 0) {
      result.items = [{
        description: 'Work',
        quantity: 1,
        rate: 50
      }];
    }

    if (!result.period) {
      const now = new Date();
      result.period = `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    }

    return {
      projectCode: result.projectCode,
      clientName: result.clientName,
      period: result.period,
      items: result.items
    };
  } catch (error) {
    console.error('Error in extractInvoiceDetails:', error);
    // Fallback to regex-based extraction if AI fails
    const projectCodeMatch = input.match(/\b(?:UP-[A-Z]+-\d+|PRJ-\d+|[A-Z]{2,}\d+)\b/i);
    const hoursMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i);
    const rateMatch = input.match(/\$?(\d+(?:\.\d+)?)\/?h(?:r|our)?/i);

    const now = new Date();
    return {
      projectCode: projectCodeMatch ? projectCodeMatch[0].toUpperCase() : 'UNKNOWN-PROJECT',
      clientName: 'Client',
      period: `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`,
      items: [{
        description: 'Work',
        quantity: hoursMatch ? parseFloat(hoursMatch[1]) : 1,
        rate: rateMatch ? parseFloat(rateMatch[1]) : 50
      }]
    };
  }
}

/**
 * Calculates earnings based on hours worked and hourly rate
 */
export function calculateEarnings(hoursWorked: number, hourlyRate: number): number {
  return parseFloat((hoursWorked * hourlyRate).toFixed(2));
}

/**
 * Parses a work log entry from natural language text
 */
export async function parseWorkLogEntry(input: string): Promise<WorkLogEntry> {
  try {
    console.log('Using regex-based parsing for work log entry');
    const hoursMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i);
    const rateMatch = input.match(/\$?(\d+(?:\.\d+)?)\/?h(?:r|our)?/i);
    const projectMatch = input.match(/project\s+([A-Z0-9-]+)/i);
    const clientMatch = input.match(/for\s+([A-Za-z0-9\s.&]+?)(?:\s+for|\s+on|\s+at|\s+$)/i);
    const descMatch = input.match(/for\s+(.+?)(?:\s+at|\s+for|\s*$)/i);

    const hours = hoursMatch ? parseFloat(hoursMatch[1]) : 1;
    const rate = rateMatch ? parseFloat(rateMatch[1]) : 75;

    return {
      description: descMatch?.[1]?.trim() || 'Development work',
      hours,
      rate,
      projectCode: projectMatch?.[1],
      clientName: clientMatch?.[1]?.trim(),
      date: new Date().toISOString().split('T')[0],
      features: [],
      total: calculateEarnings(hours, rate)
    };
  } catch (error) {
    console.error('Error in parseWorkLogEntry:', error);
    throw new Error('Failed to parse work log entry');
  }
}

/**
 * Parses natural language input into structured invoice data
 */
export async function parseWithLLM(input: string): Promise<Partial<ParsedInvoiceInput>> {
  console.log('parseWithLLM - Input:', input);

  try {
    const parsed = await extractInvoiceDetails(input);
    console.log('Extracted invoice details:', parsed);

    return {
      projectCode: parsed.projectCode,
      clientName: parsed.clientName,
      period: parsed.period,
      items: parsed.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.rate
      }))
    };
  } catch (error) {
    console.error('Error in parseWithLLM:', error);
    return {
      items: [{
        description: 'Work',
        quantity: 1,
        rate: 0
      }]
    };
  }
}

/**
 * Processes work log input and determines the next action
 */
export async function processWorkLog(input: string): Promise<ProcessWorkLogResponse> {
  console.log('Processing invoice request:', input);

  try {
    const currentDate = new Date().toISOString().split('T')[0];
    const parsedInput = await parseWithLLM(input);

    if (parsedInput.items && parsedInput.items.length > 0) {
      const invoiceItems = parsedInput.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.rate,
        amount: item.quantity * item.rate
      }));

      const subtotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);

      return {
        action: 'generate_invoice',
        data: {
          projectCode: parsedInput.projectCode || 'GENERAL',
          clientName: parsedInput.clientName || 'Client',
          period: parsedInput.period || currentDate,
          items: invoiceItems,
          subtotal,
          total: subtotal
        },
        message: 'Invoice generated successfully! Please provide an email address to send it to:'
      };
    }

    return {
      action: 'error',
      data: { input },
      message: 'I had trouble understanding that. Could you try rephrasing? Example: "5 hours of development at $75/hour"'
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing work log:', errorMessage);
    return {
      action: 'error',
      data: { input, error: errorMessage },
      message: 'An error occurred while processing your request. Please try again.'
    };
  }
}
