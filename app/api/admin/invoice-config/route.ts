import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/database';
import { initializeDatabase } from '@/lib/database';

export async function GET() {
  try {
    await initializeDatabase();
    const config = (await client.execute('SELECT * FROM invoice_config LIMIT 1')).rows;
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
    await initializeDatabase();

    const { starting_number, current_number } = await request.json();
    const result = await client.execute('SELECT id FROM invoice_config LIMIT 1');
    const rows = result.rows as { id: number }[];

    if (rows && rows.length > 0) {
      await client.execute({
        sql: 'UPDATE invoice_config SET starting_number = ?, current_number = ? WHERE id = ?',
        args: [starting_number, current_number, (rows && rows.length > 0) ? rows[0].id : null]
      });
    }
    else {
      await client.execute({
        sql: 'INSERT INTO invoice_config (starting_number, current_number) VALUES (?, ?)',
        args: [starting_number, current_number]
      });
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