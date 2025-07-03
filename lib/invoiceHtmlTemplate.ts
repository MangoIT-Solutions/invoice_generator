import { type Invoice, type InvoiceItem, type Company, type BankDetails, client } from './database';
import { formatPeriod, formatDateToMDY } from './utils';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Generate HTML markup for an invoice, dynamically filled from DB data.
 * @param invoice Invoice object
 * @param items InvoiceItem[]
 * @param company Company
 * @param bank BankDetails
 * @returns HTML string
 */
export function generateInvoiceHtml(
  invoice: Invoice,
  items: InvoiceItem[],
  company: Company,
  bank: BankDetails
): string {
  // Convert logo to Base64 Data URI for embedding
  const logoFileName = company.company_logo || 'default_logo.png';
  const logoFilePath = path.join(process.cwd(), 'public', 'uploads', path.basename(logoFileName));
  let logoDataUrl = '';
  if (fs.existsSync(logoFilePath)) {
    const imageBuffer = fs.readFileSync(logoFilePath);
    const imageType = path.extname(logoFileName).substring(1) || 'png';
    logoDataUrl = `data:image/${imageType};base64,${imageBuffer.toString('base64')}`;
  } else {
    console.error(`Logo file not found at: ${logoFilePath}`);
  }

  // Safely parse the invoice date, defaulting to today if invalid or missing.
  const invoiceDateStr = invoice.invoice_date;
  let invoiceDate = new Date(); // Default to now
  if (invoiceDateStr) {
    let parsedDate;
    // Check for YYYY-MM-DD format to avoid timezone parsing issues.
    if (/^\d{4}-\d{2}-\d{2}$/.test(invoiceDateStr)) {
      const [year, month, day] = invoiceDateStr.split('-').map(Number);
      parsedDate = new Date(Date.UTC(year, month - 1, day));
    } else {
      // Fallback for other ISO-like formats that new Date() can handle.
      parsedDate = new Date(invoiceDateStr);
    }

    if (parsedDate && !isNaN(parsedDate.getTime())) {
      invoiceDate = parsedDate;
    }
  }
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #222; margin: 0; padding: 0; }
    .main-table { width: 900px; margin: 30px auto; border: 2px solid #222; border-collapse: collapse; background: #fff; }
    .main-table td, .main-table th { border: 1px solid #222; padding: 6px 8px; }
    .header-row td { border: none; }
    .logo-cell { width: 240px; text-align: left; vertical-align: top; border: none; }
    .company-cell { text-align: left; vertical-align: top; border: none; }
    .invoice-title { text-align: center; font-size: 1.4em; font-weight: bold; padding: 8px 0 8px 0; border-bottom: 2px solid #222; border-top: 2px solid #222; }
    .billto-label { font-weight: bold; }
    .billto-cell { vertical-align: top; width: 50%; border-right: 2px solid #222; }
    .details-cell { vertical-align: top; width: 50%; }
    .details-table td { border: none; padding: 2px 6px; }
    .items-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .items-table th, .items-table td { border: 1px solid #222; padding: 6px 8px; font-size: 1em; }
    .items-table th { background: #f7f7f7; }
    .items-table .desc { text-align: left; }
    .items-table .base, .items-table .unit, .items-table .rate, .items-table .amount { text-align: right; }
    .net-balance-row td { font-weight: bold; font-size: 1.1em; text-align: right; border-top: 2px solid #222; }
    .footer { font-size: 0.95em; color: #333; padding: 10px 0 0 0; }
    .ka-cell { font-size: 0.98em; }
    .payment-instructions { font-size: 0.98em; margin: 6px 0; }
    .bank-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .bank-table td, .bank-table th { border: 1px solid #222; padding: 5px 8px; font-size: 0.97em; }
    .bank-label { font-weight: bold; }
    .highlight { background: #ffe599; }
    .late-note { font-size: 0.93em; color: #444; padding-top: 6px; }
    .export-note { font-size: 0.93em; color: #444; }
    .hsn-row td { border: none; font-size: 0.98em; }
    .thanks-row td { border: none; font-size: 1em; color: #b96b00; }
  </style>
</head>
<body>
  <table class="main-table">
    <tr class="header-row">
      <td class="logo-cell" style="border-right: none;">
        <img src="${logoDataUrl}" alt="Company Logo" style="max-width:180px;max-height:80px;object-fit:contain;background:#fff;border-radius:4px;border:1px solid #eee;padding:4px;" />
      </td>
      <td class="company-cell" colspan="2">
        <div style="font-size: 1.25em; font-weight: bold;">${company.name}</div>
        <div style="font-size: 0.97em;">a web & mobile dev company</div>
        <div style="font-size: 0.96em;">${company.address}</div>
        <div style="font-size: 0.96em;">${company.contact} / ${company.email}</div>
        <div style="font-size: 0.96em;">GSTIN-23XXXXXPS9604H1Z1</div>
      </td>
    </tr>
    <tr>
      <td colspan="3" class="invoice-title">Software Service Invoice</td>
    </tr>
    <tr>
      <td class="billto-cell" style="border-right: 2px solid #222;">
        <div class="billto-label">Bill To</div>
        <div><b>${invoice.client_company_name || invoice.client_name}</b></div>
        <div>${invoice.client_address?.replace(/\n|\r/g, ', ') || ''}</div>
        <div>KA: <b>${company.admin_name || invoice.client_name}</b></div>
        <div>Email: ${invoice.client_email}</div>
      </td>
      <td class="details-cell" colspan="2">
        <table class="details-table">
                              <tr><td>Date:</td><td>${formatDateToMDY(invoiceDate)}</td></tr>
          <tr><td>Invoice No.:</td><td>${invoice.invoice_number}</td></tr>
          <tr><td>Period:</td><td>${invoice.period ? formatPeriod(invoice.period) : 'N/A'}</td></tr>
          <tr><td>Term:</td><td>${invoice.term || 'On receipt'}</td></tr>
          <tr><td>Project code:</td><td>${invoice.project_code || 'N/A'}</td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td colspan="3" style="padding: 0;">
        <table class="items-table">
          <thead>
            <tr>
              <th class="desc" rowspan="2" style="vertical-align: middle;">Description</th>
              <th colspan="2" class="rate" style="text-align: center;">Rate</th>
              <th class="amount" rowspan="2" style="vertical-align: middle;">Amount (USD)</th>
            </tr>
            <tr>
              <th class="base" style="text-align: center;">Base</th>
              <th class="unit" style="text-align: center;">Unit</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td class="desc">${item.description}</td>
                <td class="base">${typeof item.base_rate === 'number' ? item.base_rate.toFixed(2) : Number(item.base_rate ?? 0).toFixed(2)}</td>
                <td class="unit">${typeof item.unit === 'number' ? item.unit.toFixed(2) : Number(item.unit ?? 0).toFixed(2)}</td>
                <td class="amount">${typeof item.amount === 'number' ? item.amount.toFixed(2) : Number(item.amount ?? 0).toFixed(2)}</td>
              </tr>
            `).join('')}
            ${Number(invoice.additional_charge ?? 0) > 0 ? `
              <tr>
                <td class="desc">Additional Charges</td>
                <td class="base">${Number(invoice.additional_charge ?? 0).toFixed(2)}</td>
                <td class="unit">1.00</td>
                <td class="amount">${Number(invoice.additional_charge ?? 0).toFixed(2)}</td>
              </tr>
            ` : ''}
            ${Number(invoice.payment_charges ?? 0) > 0 ? `
              <tr>
                <td class="desc">Payment Transfer Charges</td>
                <td class="base">35.00</td>
                <td class="unit">1.00</td>
                <td class="amount">${typeof invoice.payment_charges === 'number' ? invoice.payment_charges.toFixed(2) : Number(invoice.payment_charges ?? 0).toFixed(2)}</td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </td>
    </tr>
    <tr class="hsn-row">
      <td colspan="2">HSN / SAC: ${company.hsn_sac || ''}</td>
      <td class="export-note" style="text-align:right;">SUPPLY/MENT FOR EXPORT UNDER LUT WITHOUT PAYMENT OF INTEGRATED TAX</td>
    </tr>
    <tr class="net-balance-row">
      <td colspan="3">Net Balance Due: $${typeof invoice.total === 'number' ? invoice.total.toFixed(2) : Number(invoice.total ?? 0).toFixed(2)}</td>
    </tr>
    <tr class="thanks-row">
      <td colspan="3">We appreciate your business, thank you <span style="color:#b96b00;">&#10003;</span></td>
    </tr>
    <tr>
      <td colspan="3" class="ka-cell">KA: ${company.admin_name || 'MangoIT Accounts'}<br />${company.admin_department || 'Billing Department'}, ${company.name || 'Mango IT Solutions'}</td>
    </tr>
    <tr>
      <td colspan="3" class="payment-instructions">Please wire as per bank details below & send SWIFT / bank advisory to ${company.email || 'accounts@mangoitsolutions.com'}</td>
    </tr>
    <tr>
      <td colspan="3" style="padding:0;">
        <table class="bank-table">
          <tr><td class="bank-label">For credit to:</td><td>${company.name}</td></tr>
          <tr><td class="bank-label">Address:</td><td>${company.address}</td></tr>
          <tr><td class="bank-label">Account number:</td><td>${bank.account_number}</td></tr>
          <tr><td class="bank-label">Account with:</td><td>${bank.bank_name}, India</td></tr>
          <tr><td class="bank-label">Bank/Branch address:</td><td>${bank.bank_address}</td></tr>
          <tr><td class="bank-label">SWIFT:</td><td>${bank.swift_code}</td></tr>
          <tr><td class="bank-label">IFSC CODE:</td><td>${bank.ifsc_code}</td></tr>
          <tr><td class="bank-label">Bank Wire Charges:</td><td>On client side</td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td colspan="3" class="late-note">Late payments charges, if paid later than 7days per terms, @ 1.5% monthly interest or USD 35, whichever is greater.</td>
    </tr>
  </table>
</body>
</html>`;
}