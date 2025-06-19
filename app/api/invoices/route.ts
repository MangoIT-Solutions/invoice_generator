import { NextRequest, NextResponse } from 'next/server';
import { createInvoice, getNextInvoiceNumber, getUserInvoices } from '@/lib/invoice';
import { initializeDatabase, client } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();

    const data = await request.json();
    const { items, ...invoicePayload } = data;

    // Get next invoice number
    const invoiceNumber = await getNextInvoiceNumber();

    const invoice = {
      ...invoicePayload,
      client_company_name: invoicePayload.client_company_name || '',
      invoice_number: invoiceNumber
    };

    const invoiceId = await createInvoice(invoice, items);

    // Generate and save PDF right after invoice creation
    const { getInvoiceWithItems, getCompanyConfig, getBankDetails } = await import('@/lib/invoice');
    const { generateInvoiceHtml } = await import('@/lib/invoiceHtmlTemplate');
    const { generateInvoicePdf } = await import('@/lib/invoicePdf');
    const dbInvoiceData = await getInvoiceWithItems(invoiceId);
    const company = await getCompanyConfig();
    const bank = await getBankDetails();
    const html = generateInvoiceHtml(dbInvoiceData.invoice, dbInvoiceData.items, company, bank);
    const pdfFileName = `invoice-${invoiceNumber}.pdf`;
    try {
      console.log(`[Invoice] Generating PDF for invoiceId=${invoiceId}, invoiceNumber=${invoiceNumber} as ${pdfFileName}`);
      await generateInvoicePdf(html, pdfFileName);
      console.log(`[Invoice] PDF generated successfully: ${pdfFileName}`);
    } catch (pdfError) {
      console.error(`[Invoice] Failed to generate PDF for invoiceId=${invoiceId}:`, pdfError);
      return NextResponse.json({ error: 'Failed to generate invoice PDF', details: pdfError?.message || pdfError }, { status: 500 });
    }

    return NextResponse.json({ success: true, invoiceId, invoiceNumber });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();
    // For admin: return all invoices, for user: filter by user-id header
    const userId = request.headers.get('user-id');
    let invoices;
    if (userId) {
      invoices = await getUserInvoices(parseInt(userId));
    } else {
      // Return all invoices for admin
      invoices = await getUserInvoices(); // update getUserInvoices to support no userId for all
    }
    return NextResponse.json({ invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

// DELETE /api/invoices/[id]
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    await client.execute({
      sql: 'DELETE FROM invoices WHERE id = ?',
      args: [id],
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
  }
}