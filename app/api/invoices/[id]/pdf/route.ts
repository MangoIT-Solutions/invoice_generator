import { NextRequest } from 'next/server';
import { getInvoiceWithItems, getCompanyConfig, getBankDetails } from '@/services/invoice.service';
import { initDB } from '@/database/db';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { generateInvoicePdf } from '@/lib/invoicePdf';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: number }> }
) {
  try {
    await initDB();
    const { id } = await params;
    const pdfDir = path.join(process.cwd(), 'public', 'invoices');
    const pdfPath = path.join(pdfDir, `invoice-${id}.pdf`);

    // Check if PDF already exists, if not generate it
    if (!existsSync(pdfPath)) {
      const invoiceData = await getInvoiceWithItems(id);
      if (!invoiceData) {
        return new Response('Invoice not found', { status: 404 });
      }

      const company:any = await getCompanyConfig();
      const bank:any = await getBankDetails();

      // Combine invoice and items into a single object for the PDF generator
      const invoiceWithItems:any = {
        ...invoiceData.invoice,
        items: invoiceData.items
      };

      // Generate the PDF
      await generateInvoicePdf(
        invoiceWithItems,
        company,
        bank,
        `invoice-${id}.pdf`
      );
    }

    // Read and return the generated PDF
    const pdfBuffer = readFileSync(pdfPath);
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=invoice-${id}.pdf`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error('Error generating/serving PDF:', error);
    return new Response('Error generating PDF', { status: 500 });
  }
}
