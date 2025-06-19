import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

/**
 * Generate a PDF from HTML markup and save to disk.
 * @param htmlContent HTML string to render as PDF
 * @param pdfFileName Output PDF filename (e.g. invoice-123.pdf)
 * @returns Absolute path to the generated PDF file
 */
export async function generateInvoicePdf(htmlContent: string, pdfFileName: string) {
  const pdfDir = path.join(process.cwd(), 'public', 'invoices');
  const pdfPath = path.join(pdfDir, pdfFileName);
  mkdirSync(pdfDir, { recursive: true });

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true, // Use 'true' for headless mode, or 'shell' if needed (no 'new')
  });
  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('screen');
    const pdfBuffer = await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: 40, right: 20, bottom: 40, left: 20 },
    });
    await page.close();
    return pdfPath;
  } finally {
    await browser.close();
  }
}
