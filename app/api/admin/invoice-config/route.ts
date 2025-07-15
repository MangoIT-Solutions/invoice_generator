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

    // ✅ Step 1: Get and sanitize request body
    const body = await request.json();

    const starting_number = Number(body.starting_number) || 1000;
    const current_number = Number(body.current_number) || 1000;
    const invoiceRequestEmailAllowed = body.invoiceRequestEmailAllowed || "";
    const upaidInvoiceReminderDays = Number(body.upaidInvoiceReminderDays) || 0;
    const marginAmountForUnduePayment = body.marginAmountForUnduePayment || "";

    // ✅ Decimal validation for marginAmountForUnduePayment
    const isDecimal = /^-?\d+\.\d+$/.test(marginAmountForUnduePayment);

    if (!isDecimal) {
      return NextResponse.json(
        { error: "Margin Amount must be a valid decimal number" },
        { status: 400 }
      );
    }

    // ✅ Step 2: Handle invoice_config table
    const result = await client.execute(
      "SELECT id FROM invoice_config LIMIT 1"
    );
    const rows = result.rows as { id: number }[];

    if (rows.length > 0) {
      await client.execute({
        sql: `
          UPDATE invoice_config
          SET starting_number = ?, current_number = ?
          WHERE id = ?
        `,
        args: [starting_number, current_number, rows[0].id],
      });
    } else {
      await client.execute({
        sql: `
          INSERT INTO invoice_config (starting_number, current_number)
          VALUES (?, ?)
        `,
        args: [starting_number, current_number],
      });
    }

    // ✅ Step 3: Upsert helper for config table
    const upsertConfig = async (key: string, value: string) => {
      const existing = await client.execute({
        sql: "SELECT id FROM config WHERE `key` = ?",
        args: [key],
      });

      const rows = existing.rows as { id: number }[];

      if (rows.length > 0) {
        await client.execute({
          sql: "UPDATE config SET `value` = ?, updated_at = NOW() WHERE id = ?",
          args: [value, rows[0].id],
        });
      } else {
        await client.execute({
          sql: "INSERT INTO config (`key`, `value`, created_at, updated_at) VALUES (?, ?, NOW(), NOW())",
          args: [key, value],
        });
      }
    };

    // ✅ Step 4: Store additional config values
    await upsertConfig(
      "invoiceRequestEmailAllowed",
      invoiceRequestEmailAllowed
    );
    await upsertConfig(
      "upaidInvoiceReminderDays",
      String(upaidInvoiceReminderDays)
    );
    await upsertConfig(
      "marginAmountForUnduePayment",
      marginAmountForUnduePayment
    );

    // ✅ Success response
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating invoice config:", error);
    return NextResponse.json(
      { error: "Failed to update invoice configuration" },
      { status: 500 }
    );
  }
}

