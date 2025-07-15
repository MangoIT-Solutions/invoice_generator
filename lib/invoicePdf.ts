import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { generateInvoiceHtml } from './invoiceHtmlTemplate';
import type { Invoice  } from '@/model/invoice.model';
import type { InvoiceItem  } from '@/model/invoice-item.model';
import type { Company as CompanyInstance } from '@/model/company.model';
import type { BankDetails as BankDetailsInstance } from '@/model/bank-details.model';

interface InvoiceWithItems extends Omit<Invoice, 'id' | 'user_id' | 'created_at'> {
  id: number;
  items: InvoiceItem[];
  [key: string]: any; // For any additional properties
}

/**
 * Generate a PDF from invoice data and save to disk.
 * @param invoiceData Invoice instance + associated items
 * @param company Sequelize Company instance
 * @param bank Sequelize BankDetails instance
 * @param pdfFileName Output filename (e.g., invoice-123.pdf)
 */


export async function generateInvoicePdf(
  invoiceData: InvoiceWithItems,
  company: CompanyInstance,
  bank: BankDetailsInstance,
  pdfFileName: string
): Promise<string> {
  const pdfDir = path.join(process.cwd(), 'public', 'invoices');
  const pdfPath = path.join(pdfDir, pdfFileName);

  // Ensure invoices directory exists
  mkdirSync(pdfDir, { recursive: true });

  const items = invoiceData.items.map(item => item.get({ plain: true }));

  const htmlContent = generateInvoiceHtml(
    {
      ...invoiceData,
      client_company_name: invoiceData.client_company_name || invoiceData.client_name,
      client_address: invoiceData.client_address || '',
      client_email: invoiceData.client_email || '',
      invoice_date: invoiceData.invoice_date || new Date().toISOString().split('T')[0],
      period: invoiceData.period || '',
      term: invoiceData.term || 'On receipt',
      project_code: invoiceData.project_code || '',
      subtotal: invoiceData.subtotal || 0,
      payment_charges: invoiceData.payment_charges || 0,
      total: invoiceData.total || 0,
      status: invoiceData.status || 'draft',
      user_id: invoiceData.user_id ?? '', // Ensure user_id is present
      created_at: invoiceData.created_at ?? new Date().toISOString() // Ensure created_at is present
    },
    invoiceData.items || [],
    company,
    bank
  );

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });

  try {
    const page = await browser.newPage();

    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await page.emulateMediaType('screen');

    const pdfBuffer = await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: 40, right: 20, bottom: 40, left: 20 },
      preferCSSPageSize: true,
    });

    writeFileSync(pdfPath, pdfBuffer);
    return pdfPath;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  } finally {
    await browser.close();
  }
}
