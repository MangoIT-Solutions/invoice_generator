import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import nodemailer from 'nodemailer';

export async function GET(req: NextRequest) {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Fetch due reminders
    const [rows] = await pool.query('SELECT * FROM recurring_invoices WHERE next_run <= ?', [todayStr]);

    if (!Array.isArray(rows) || !rows.length) {
      return NextResponse.json({ ok: true, message: 'No reminders due today.' });
    }

    // Setup transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: { rejectUnauthorized: false },
    });

    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER;

    for (const rec of rows as any[]) {
      const { invoice_id, next_run } = rec;
      const mailOptions = {
        from: process.env.SMTP_NAME && process.env.SMTP_FROM
          ? `${process.env.SMTP_NAME} <${process.env.SMTP_FROM}>`
          : (process.env.SMTP_FROM || process.env.SMTP_USER),
        to: adminEmail,
        subject: `Recurring invoice reminder (ID ${invoice_id})`,
        text: `It's time to generate the recurring invoice for invoice_id ${invoice_id}. Scheduled date: ${next_run}.`,
      };
      try {
        await transporter.sendMail(mailOptions);
      } catch (e) {
        console.error('Failed to send reminder:', e);
      }

      // Push next_run by 1 month
      const next = new Date(next_run);
      next.setMonth(next.getMonth() + 1);
      await pool.query('UPDATE recurring_invoices SET next_run = ? WHERE id = ?', [next.toISOString().split('T')[0], rec.id]);
    }

    return NextResponse.json({ ok: true, sent: rows.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
