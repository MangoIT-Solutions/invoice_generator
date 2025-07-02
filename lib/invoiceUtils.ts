import { WorkLogEntry } from './llmUtils';

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  from: {
    name: string;
    email: string;
    address: string;
  };
  to: {
    name: string;
    email: string;
    address: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

export function generateInvoice(workLogs: WorkLogEntry[]): InvoiceData {
  const now = new Date();
  const dueDate = new Date();
  dueDate.setDate(now.getDate() + 15); // 15 days from now

  // Group work logs by project
  const projects = workLogs.reduce<Record<string, WorkLogEntry[]>>((acc, log) => {
    if (!log.projectCode) {
      // Handle logs without project code
      const defaultProject = 'DEFAULT';
      if (!acc[defaultProject]) {
        acc[defaultProject] = [];
      }
      acc[defaultProject].push(log);
      return acc;
    }
    
    if (!acc[log.projectCode]) {
      acc[log.projectCode] = [];
    }
    acc[log.projectCode].push(log);
    return acc;
  }, {});

  const items = Object.entries(projects).map(([projectCode, logs]) => {
    const hours = logs.reduce((sum, log) => sum + (log.hours || 0), 0);
    const rate = logs[0]?.rate || 75; // Default rate if not specified
    const amount = hours * rate;
    
    return {
      description: `Development work for ${projectCode}`,
      quantity: hours,
      rate,
      amount: parseFloat(amount.toFixed(2))
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;

  return {
    invoiceNumber: `INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    date: now.toISOString().split('T')[0],
    dueDate: dueDate.toISOString().split('T')[0],
    from: {
      name: 'Your Company Name',
      email: 'billing@yourcompany.com',
      address: '123 Business St, City, Country'
    },
    to: {
      name: workLogs[0]?.clientName || 'Client Name',
      email: 'client@example.com',
      address: 'Client Address'
    },
    items,
    subtotal,
    tax,
    total,
    notes: 'Thank you for your business!'
  };
}

export function generateInvoicePdf(invoice: InvoiceData): Promise<Buffer> {
  // This is a placeholder - you'll need to implement PDF generation
  // You can use a library like pdfkit, jspdf, or a template engine
  return Promise.resolve(Buffer.from(JSON.stringify(invoice, null, 2)));
}

export async function sendInvoiceEmail(invoice: InvoiceData, toEmail: string): Promise<boolean> {
  // This is a placeholder - implement email sending using Nodemailer or similar
  console.log(`Would send invoice ${invoice.invoiceNumber} to ${toEmail}`);
  return true;
}
