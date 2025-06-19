import { NextRequest, NextResponse } from 'next/server';
import { getInvoiceWithItems, getCompanyConfig, getBankDetails } from '@/lib/invoice';
import { initializeDatabase } from '@/lib/database';
import nodemailer from 'nodemailer';
import path from 'path';
import { readFileSync, existsSync } from 'fs';

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  try {
    await initializeDatabase();
    const { id } = context.params;
    let to = '';
    let subject = '';
    let message = '';
    try {
      const body = await request.json();
      if (body && typeof body === 'object') {
        if (body.to) to = body.to;
        if (body.subject) subject = body.subject;
        if (body.message) message = body.message;
      }
    } catch (e) {
      // If parsing fails, just use defaults (likely a GET or empty POST)
    }
    const invoiceData = await getInvoiceWithItems(parseInt(id));
    if (!invoiceData) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    const company = await getCompanyConfig();
    const bank = await getBankDetails();
    // Only use the existing PDF generated at invoice creation
    const pdfFileName = `invoice-${invoiceData.invoice.invoice_number}.pdf`;
    const pdfPath = path.join(process.cwd(), 'public', 'invoices', pdfFileName);
    let pdfBuffer: Buffer | null = null;
    if (existsSync(pdfPath)) {
      pdfBuffer = readFileSync(pdfPath);
    } else {
      // Regenerate PDF if missing
      const { generateInvoiceHtml } = await import('@/lib/invoiceHtmlTemplate');
      const html = generateInvoiceHtml(invoiceData.invoice, invoiceData.items, company, bank);
      await (await import('@/lib/invoicePdf')).generateInvoicePdf(html, pdfFileName);
      if (existsSync(pdfPath)) {
        pdfBuffer = readFileSync(pdfPath);
      } else {
        return NextResponse.json({ error: 'Failed to generate PDF for email.' }, { status: 500 });
      }
    }
    // Configure SMTP transporter
    // Enable less secure app access for Gmail or use an App Password if 2FA is enabled
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates (Gmail sometimes requires this)
      },
    });
    // Compose email
    const mailOptions = {
      from: process.env.SMTP_NAME && process.env.SMTP_FROM
        ? `${process.env.SMTP_NAME} <${process.env.SMTP_FROM}>`
        : (process.env.SMTP_FROM || process.env.SMTP_USER),
      to: to || invoiceData.invoice.client_email,
      subject: subject || `Invoice #${invoiceData.invoice.invoice_number}`,
      text: message || 'Please find attached your invoice.',
      attachments: [
        {
          filename: pdfFileName,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ],
    };
    // Send email
    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true, message: 'Invoice sent successfully' });
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return NextResponse.json({ error: 'Failed to send invoice email' }, { status: 500 });
  }
}