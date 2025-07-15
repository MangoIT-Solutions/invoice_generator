import { NextRequest, NextResponse } from 'next/server';
import { initDB } from '@/database/db';
import { InvoiceConfig } from '@/model/invoice-config.model';

export async function GET() {
  try {
    await initDB();

    const config = await InvoiceConfig.findOne();
    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error fetching invoice config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDB();

    const { starting_number, current_number } = await request.json();

    const existing = await InvoiceConfig.findOne();

    if (existing) {
      await InvoiceConfig.update(
        { starting_number, current_number },
        { where: { id: existing.getDataValue('id') } }
      );
    } else {
      await InvoiceConfig.create({ starting_number, current_number });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating invoice config:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice configuration' },
      { status: 500 }
    );
  }
}
