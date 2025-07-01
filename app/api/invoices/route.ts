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
      invoice_date: new Date().toISOString().split('T')[0], // Set current date
      invoice_number: invoiceNumber,
    };

    const invoiceId = await createInvoice(invoice, items);

    // --- PDF Generation ---
    const { getInvoiceWithItems, getCompanyConfig, getBankDetails } = await import('@/lib/invoice');
    const { generateInvoicePdf } = await import('@/lib/invoicePdf');

    const dbInvoiceData = await getInvoiceWithItems(invoiceId);
    if (!dbInvoiceData || !dbInvoiceData.invoice) {
      console.error(`[Invoice] Failed to retrieve invoice data after creation for invoiceId=${invoiceId}`);
      return NextResponse.json({ error: 'Failed to retrieve invoice data after creation' }, { status: 500 });
    }

    const company = await getCompanyConfig();
    const bank = await getBankDetails();
    const pdfFileName = `invoice-${invoiceNumber}.pdf`;

    // The invoice object from the DB is the source of truth
    const invoiceWithItems = {
      ...dbInvoiceData.invoice,
      items: dbInvoiceData.items,
    };

    if (!company || !bank) {
        return NextResponse.json({ error: 'Server configuration for company or bank is missing.' }, { status: 500 });
    }

    try {
      console.log(`[Invoice] Generating PDF for invoiceId=${invoiceId}, invoiceNumber=${invoiceNumber} as ${pdfFileName}`);
      await generateInvoicePdf(invoiceWithItems, company, bank, pdfFileName);
      console.log(`[Invoice] PDF generated successfully: ${pdfFileName}`);
    } catch (pdfError: unknown) {
      console.error(`[Invoice] Failed to generate PDF for invoiceId=${invoiceId}:`, pdfError);
      const errorMessage = pdfError instanceof Error ? pdfError.message : String(pdfError);
      return NextResponse.json({ error: 'Failed to generate invoice PDF', details: errorMessage }, { status: 500 });
    }

    return NextResponse.json({ success: true, invoiceId, invoiceNumber });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice', details: errorMessage },
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