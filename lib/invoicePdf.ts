import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { generateInvoiceHtml } from './invoiceHtmlTemplate';
import type { Invoice, Company, BankDetails, InvoiceItem } from './database';

interface InvoiceWithItems extends Omit<Invoice, 'id' | 'user_id' | 'created_at'> {
  id: number;
  items: InvoiceItem[];
  [key: string]: any; // For any additional properties
}

/**
 * Generate a PDF from invoice data and save to disk.
 * @param invoiceData Invoice data with items
 * @param company Company configuration
 * @param bank Bank details
 * @param pdfFileName Output PDF filename (e.g. invoice-123.pdf)
 * @returns Promise that resolves when PDF is generated
 */
export async function generateInvoicePdf(
  invoiceData: InvoiceWithItems,
  company: Company,
  bank: BankDetails,
  pdfFileName: string
): Promise<string> {
  const pdfDir = path.join(process.cwd(), 'public', 'invoices');
  const pdfPath = path.join(pdfDir, pdfFileName);
  
  // Ensure the invoices directory exists
  mkdirSync(pdfDir, { recursive: true });

  // Generate HTML content
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
      status: invoiceData.status || 'draft'
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
    
    // Set content and wait for any resources to load
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 // 30 seconds timeout
    });
    
    // Emulate screen media type for better rendering
    await page.emulateMediaType('screen');

    // Generate PDF
    const pdfBuffer = await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: 40, right: 20, bottom: 40, left: 20 },
      preferCSSPageSize: true,
    });

    // Save the PDF file
    writeFileSync(pdfPath, pdfBuffer);
    
    return pdfPath;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  } finally {
    await browser.close();
  }
}
