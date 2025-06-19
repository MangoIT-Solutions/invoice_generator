import { NextRequest } from 'next/server';
import { getInvoiceWithItems, getCompanyConfig, getBankDetails } from '@/lib/invoice';
import { initializeDatabase } from '@/lib/database';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { generateInvoicePdf } from '@/lib/invoicePdf';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    await initializeDatabase();
    const invoiceId = Number(params.id);
    const pdfDir = path.join(process.cwd(), 'public', 'invoices');
    const pdfPath = path.join(pdfDir, `invoice-${invoiceId}.pdf`);
    if (!existsSync(pdfPath)) {
        const invoiceData = await getInvoiceWithItems(invoiceId);
        if (!invoiceData) {
            return new Response('Invoice not found', { status: 404 });
        }
        const company = await getCompanyConfig();
        const bank = await getBankDetails();
        await generateInvoicePdf(invoiceData, company, bank, `invoice-${invoiceId}.pdf`);
    }
    const pdfBuffer = readFileSync(pdfPath);
    return new Response(pdfBuffer, {
        status: 200,
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=invoice-${invoiceId}.pdf`,
            'Content-Length': String(pdfBuffer.length),
        },
    });
}
