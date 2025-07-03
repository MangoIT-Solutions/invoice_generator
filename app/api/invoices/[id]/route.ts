import { NextRequest, NextResponse } from 'next/server';
import { getInvoiceWithItems, getCompanyConfig, getBankDetails } from '@/lib/invoice';
import { initializeDatabase } from '@/lib/database';
import { client } from '@/lib/database';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
  try {
    await initializeDatabase();

    const { id } = await params;
    const invoiceData = await getInvoiceWithItems(id);

    if (!invoiceData) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const company = await getCompanyConfig();
    const bank = await getBankDetails();

    return NextResponse.json({
      ...invoiceData,
      company,
      bank
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
  try {
    await initializeDatabase();
    const { id } = await params;
    await client.execute({
      sql: 'DELETE FROM invoices WHERE id = ?',
      args: [id],
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
  }
}