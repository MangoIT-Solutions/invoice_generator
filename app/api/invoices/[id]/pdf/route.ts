import { NextRequest } from 'next/server';
import { getInvoiceWithItems, getCompanyConfig, getBankDetails } from '@/lib/invoice';
import { initializeDatabase } from '@/lib/database';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { generateInvoicePdf } from '@/lib/invoicePdf';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: number }> }
) {
  try {
    await initializeDatabase();
    const invoiceId = Number(await params);
    const pdfDir = path.join(process.cwd(), 'public', 'invoices');
    const pdfPath = path.join(pdfDir, `invoice-${invoiceId}.pdf`);

    // Check if PDF already exists, if not generate it
    if (!existsSync(pdfPath)) {
      const invoiceData = await getInvoiceWithItems(invoiceId);
      if (!invoiceData) {
        return new Response('Invoice not found', { status: 404 });
      }

      const company = await getCompanyConfig();
      const bank = await getBankDetails();
      // Combine invoice and items into a single object for the PDF generator
      const invoiceWithItems = {
        ...invoiceData.invoice,
        items: invoiceData.items
      };

      // Generate the PDF
      await generateInvoicePdf( 
        invoiceWithItems,
        company,
        bank,
        `invoice-${invoiceId}.pdf`
      );
    }

    // Read and return the generated PDF
    const pdfBuffer = readFileSync(pdfPath);
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=invoice-${invoiceId}.pdf`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error('Error generating/serving PDF:', error);
    return new Response('Error generating PDF', { status: 500 });
  }
}
