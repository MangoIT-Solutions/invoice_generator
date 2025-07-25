
import { NextRequest, NextResponse } from 'next/server';
import { getInvoiceWithItems, getCompanyConfig, getBankDetails } from '@/services/invoice.service';
import { initDB } from '@/database/db';
import nodemailer from 'nodemailer'
import path from 'path';
import { readFileSync, existsSync } from 'fs';
import { generateInvoicePdf } from '@/lib/invoicePdf';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
}; 

// Handle preflight requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: number }> }) {
  try {
    await initDB();
    const { id } = await params;
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
      // If parsing fails, just use defaults
      
    }

    const invoiceData = await getInvoiceWithItems(id);
    if (!invoiceData) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404, headers: corsHeaders });
    }
    const company:any = await getCompanyConfig();
    const bank:any = await getBankDetails();

    const pdfFileName = `invoice-${id}.pdf`;
    const pdfPath = path.join(process.cwd(), 'public', 'invoices', pdfFileName);
    let pdfBuffer: Buffer | null = null;

    if (existsSync(pdfPath)) {
      pdfBuffer = readFileSync(pdfPath);
    } else {
      // Regenerate PDF if missing
      const invoiceWithItems:any = { ...invoiceData.invoice, items: invoiceData.items };
     const pdfPath =  await generateInvoicePdf(invoiceWithItems, company, bank, `invoice-${id}.pdf`);
      if (existsSync(pdfPath)) {
        pdfBuffer = readFileSync(pdfPath);
      } else {
        return NextResponse.json({ error: 'Failed to regenerate PDF for email.' }, { status: 500, headers: corsHeaders });
      }
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

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

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true, message: 'Invoice sent successfully' }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return NextResponse.json({ error: 'Failed to send invoice email' }, { status: 500, headers: corsHeaders });
  }
}