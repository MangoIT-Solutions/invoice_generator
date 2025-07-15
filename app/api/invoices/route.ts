import { NextRequest, NextResponse } from 'next/server';
import {
  createInvoice,
  getNextInvoiceNumber,
  getUserInvoices,
  getInvoiceWithItems,
  getCompanyConfig,
  getBankDetails,
} from '@/services/invoice.service';
import { generateInvoicePdf } from '@/lib/invoicePdf';
import { Invoice } from '@/model/invoice.model';
import { initDB } from '@/database/db';
import type { Invoice as InvoiceInstance } from '@/model/invoice.model';
import type { InvoiceItem as InvoiceItemInstance } from '@/model/invoice-item.model';
import type { Company } from '@/model/company.model';
import type { BankDetails } from '@/model/bank-details.model';

interface InvoiceWithItems {
  invoice: InvoiceInstance;
  items: InvoiceItemInstance[];
}

export async function POST(request: NextRequest) {
  try {
    await initDB();

    const data = await request.json();
    const { items, ...invoicePayload } = data;

    // Generate next invoice number
    const invoiceNumber = await getNextInvoiceNumber();
    const invoice = {
      ...invoicePayload,
      invoice_date: new Date().toISOString().split('T')[0],
      invoice_number: invoiceNumber,
    };

    // Create the invoice in DB
    const invoiceId = await createInvoice(invoice, items);

    // Fetch full invoice data with associated items
    const dbInvoiceData = await getInvoiceWithItems(invoiceId);

    if (!dbInvoiceData || !dbInvoiceData.invoice) {
      return NextResponse.json(
        { error: 'Failed to retrieve invoice data after creation' },
        { status: 500 }
      );
    }

    // Get company and bank info
    const company = await getCompanyConfig();
    const bank = await getBankDetails();

    if (!company || !bank) {
      return NextResponse.json(
        { error: 'Server configuration for company or bank is missing.' },
        { status: 500 }
      );
    }

    const pdfFileName = `invoice-${invoiceNumber}.pdf`;

    // ✅ Assert correct types for TypeScript
    const invoiceWithItems: InvoiceWithItems = {
      invoice: dbInvoiceData.invoice as InvoiceInstance,
      items: dbInvoiceData.items as InvoiceItemInstance[],
    };

    try {
      await generateInvoicePdf(invoiceWithItems , company as Company, bank as BankDetails, pdfFileName);
    } catch (pdfError: unknown) {
      console.error(`[Invoice] Failed to generate PDF for invoiceId=${invoiceId}:`, pdfError);
      const errorMessage = pdfError instanceof Error ? pdfError.message : String(pdfError);
      return NextResponse.json(
        { error: 'Failed to generate invoice PDF', details: errorMessage },
        { status: 500 }
      );
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
    await initDB();

    const userId = request.headers.get('user-id');
    let invoices;
    if (userId) {
      invoices = await getUserInvoices(parseInt(userId));
    } else {
      invoices = await getUserInvoices(); // Admin access
    }

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

// DELETE /api/invoices/[id]
export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
    try {
      const { id } = context.params;
  
      const deletedCount = await Invoice.destroy({
        where: { id: parseInt(id) },
      });
  
      if (deletedCount === 0) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
  
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting invoice:', error);
      return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
    }
  }
