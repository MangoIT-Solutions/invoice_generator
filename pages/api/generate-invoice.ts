import type { NextApiRequest, NextApiResponse } from 'next';
import { WorkLogEntry } from '../../lib/llmUtils';
import { generateInvoice, generateInvoicePdf, sendInvoiceEmail } from '../../lib/invoiceUtils';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { workLogs, email } = req.body as { workLogs: WorkLogEntry[]; email: string };
    
    if (!workLogs || !workLogs.length) {
      return res.status(400).json({ error: 'No work logs provided' });
    }

    // Generate invoice data
    const invoice = generateInvoice(workLogs);
    
    // Generate PDF (in a real app, implement proper PDF generation)
    const pdfBuffer = await generateInvoicePdf(invoice);
    
    // Send email with invoice attached
    const emailSent = await sendInvoiceEmail(invoice, email);
    
    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send email' });
    }

    // Return the invoice data and a download link
    res.status(200).json({
      success: true,
      invoice,
      downloadUrl: `/api/download-invoice/${invoice.invoiceNumber}`,
      message: `Invoice generated and sent to ${email}`
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ 
      error: 'Failed to generate invoice',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
