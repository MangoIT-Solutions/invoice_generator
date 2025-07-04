// Invoice generation utilities

export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface InvoiceData {
  projectCode: string;
  clientName: string;
  period: string;
  items: InvoiceItem[];
  subtotal: number;
  total: number;
}

export type InvoiceAction = 'collect_email' | 'generate_invoice' | 'error';

export interface InvoiceResponse {
  action: InvoiceAction;
  data: any;
  message: string;
}

export function calculateTotal(items: InvoiceItem[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

export async function processInvoiceRequest(input: string): Promise<InvoiceResponse> {
  try {
    // Parse the input to extract invoice details
    const parsedInput = await parseInvoiceInput(input);
    
    // Calculate amounts for each item
    const invoiceItems = parsedInput.items.map(item => ({
      ...item,
      amount: item.quantity * item.rate
    }));
    
    const subtotal = calculateTotal(invoiceItems);
    
    // Return data needed for invoice generation
    return {
      action: 'collect_email',
      data: {
        projectCode: parsedInput.projectCode || 'GENERAL',
        clientName: parsedInput.clientName || 'Client',
        period: parsedInput.period || new Date().toISOString().split('T')[0],
        items: invoiceItems,
        subtotal,
        total: subtotal // Add any taxes or discounts if needed
      },
      message: '✅ Invoice ready! Please provide an email address to send it to:'
    };
    
  } catch (error) {
    console.error('Error processing invoice request:', error);
    return {
      action: 'error',
      data: { error: String(error) },
      message: 'Sorry, I encountered an error processing your invoice request. Please try again.'
    };
  }
}

// Simple parser - in a real app, this would use an LLM
async function parseInvoiceInput(input: string): Promise<{
  projectCode: string;
  clientName: string;
  period: string;
  items: Array<{ description: string; quantity: number; rate: number }>;
}> {
  // Default values
  return {
    projectCode: 'PROJ-' + Math.floor(Math.random() * 1000),
    clientName: 'Client',
    period: new Date().toISOString().split('T')[0],
    items: [
      {
        description: 'Development work',
        quantity: 5,
        rate: 75
      }
    ]
  };
}
