'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Mail, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface InvoiceData {
  invoice: any;
  items: any[];
  company: any;
  bank: any;
}

export default function InvoiceView() {
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({
    to: invoiceData?.invoice?.client_email || '',
    subject: invoiceData ? `Invoice #${invoiceData.invoice.invoice_number}` : '',
    message: 'Please find attached your invoice.'
  });
  const params = useParams();
  const router = useRouter();
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInvoice();
  }, []);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${params.id}`);
      const data = await response.json();
      if (response.ok) {
        setInvoiceData(data);
      } else {
        toast.error('Invoice not found');
        router.push('/dashboard');
      }
    } catch (error) {
      toast.error('Failed to fetch invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!invoiceRef.current) return;

    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`invoice-${invoiceData?.invoice.invoice_number}.pdf`);
    } catch (error) {
      toast.error('Failed to generate PDF');
    }
  };

  const sendEmail = async () => {
    try {
      const response = await fetch(`/api/invoices/${params.id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailForm)
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Invoice sent successfully');
        setDialogOpen(false);
      } else {
        toast.error(data.error || 'Failed to send invoice');
      }
    } catch (error) {
      toast.error('Failed to send email');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!invoiceData) {
    return null;
  }

  const { invoice, items, company, bank } = invoiceData;

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={generatePDF}>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
                <Button onClick={() => setDialogOpen(true)}>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Email
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-0">
              <div
                ref={invoiceRef}
                className="bg-white border-2 border-gray-900 rounded-md"
                style={{ boxSizing: 'border-box' }}
              >
                <div className="px-6 py-4">
                  {/* Company Info Row */}
                  <div className="flex justify-between items-start">
                    {/* Logo - Left Aligned */}
                    <div className="w-48">
                      {company?.company_logo && (
                        <img
                          src={company.company_logo.startsWith('uploads/') || company.company_logo.startsWith('/uploads/') ? `/` + company.company_logo.replace(/^\/+/, '') : `/uploads/${company.company_logo.replace(/^\/+/, '')}`}
                          alt="Company Logo"
                          className="h-16 object-contain bg-white border border-gray-200 p-1"
                        />
                      )}
                    </div>

                    {/* Company Details - Right Aligned */}
                    <div className="text-right">
                      <h1 className="text-xl font-bold">{company?.name || 'Mango IT Solutions'}</h1>
                      <p className="text-sm text-gray-600 -mt-1">a web & mobile dev company</p>
                      <div className="text-xs mt-1 space-y-0.5">
                        <p>{company?.address || '15/3 Old Palasia, Behind Sarda House, Indore 452 001 INDIA'}</p>
                        <p>{company?.contact || '+91-731-4044117'} / {company?.email || 'accounts@mangoitsolutions.com'}</p>
                        <p>GSTIN-23XXXXXPS9604H1Z1 {company?.hsn_sac && `• HSN / SAC: ${company.hsn_sac}`}</p>
                      </div>
                    </div>
                  </div>

                  {/* Invoice Title */}
                  <div className="mt-4 -mx-6 px-6 border-t-2 border-b-2 border-black text-center">
                    <h2 className="text-lg font-bold py-1">Software Service Invoice</h2>
                  </div>
                </div>

                {/* Invoice Details - split left/right */}
                <div className="flex flex-row -mx-6 px-6 py-2 m-2 p-2 ">
                  {/* Left: Bill To (client info) */}
                  <div className="w-1/2 pr-4 p-2 border-r-2 border-black">
                    <h3 className="text-sm font-bold mb-1">Bill To</h3>
                    <div className="text-xs mb-1">
                      <p className="font-bold">{invoice.client_company_name || invoice.client_name}</p>
                      <p>{invoice.client_address?.replace(/\n|\r/g, ', ')}</p>
                    </div>
                    <div className="text-xs">
                      <p>KA: <span className="font-bold">{invoice.client_name}</span> | Email: {invoice.client_email}</p>
                    </div>
                  </div>

                  {/* Right: Invoice Info */}
                  <div className="w-1/2 pl-4">
                    <table className="w-full text-xs">
                      <tbody>
                        <tr>
                          <td className="w-24 py-0.5">Date:</td>
                          <td className="py-0.5">{invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-') : ''}</td>
                        </tr>
                        <tr>
                          <td className="py-0.5">Invoice No.:</td>
                          <td className="py-0.5">{invoice.invoice_number}</td>
                        </tr>
                        <tr>
                          <td className="py-0.5">Period:</td>
                          <td className="py-0.5">{invoice.period ? formatPeriod(invoice.period) : 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="py-0.5">Term:</td>
                          <td className="py-0.5">{invoice.term || 'On receipt'}</td>
                        </tr>
                        <tr>
                          <td className="py-0.5">Project code:</td>
                          <td className="py-0.5">{invoice.project_code || 'N/A'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Items Table */}
                <div className="-mx-6 px-6">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-t-2 border-black">
                        <th className="px-3 py-1 text-left text-sm font-normal" rowSpan={2}>Description</th>
                        <th className="px-3 py-1 text-center text-sm font-normal border-l border-black" colSpan={2}>Rate</th>
                        <th className="px-3 py-1 text-right text-sm font-normal border-l border-black" rowSpan={2}>Amount (USD)</th>
                      </tr>
                      <tr className="border-b-2 border-black">
                        <th className="px-3 py-1 text-center text-sm font-normal border-l border-black">Base</th>
                        <th className="px-3 py-1 text-center text-sm font-normal border-l border-r border-black">Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index} className="border-b border-black">
                          <td className="px-3 py-2 align-top">
                            <div className="text-sm">{item.description}</div>
                            {item.details && (
                              <div className="text-xs text-gray-500 mt-1 whitespace-pre-line">{item.details}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right align-top text-sm border-l border-black">
                            {typeof item.base_rate === 'number' ? item.base_rate.toFixed(2) : Number(item.base_rate ?? 0).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right align-top text-sm border-l border-r border-black">
                            {typeof item.unit === 'number' ? item.unit : Number(item.unit ?? 0)}
                          </td>
                          <td className="px-3 py-2 text-right align-top text-sm border-l border-black">
                            {typeof item.amount === 'number' ? item.amount.toFixed(2) : Number(item.amount ?? 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {invoice.payment_charges > 0 && (
                        <tr className="border-b border-black">
                          <td className="px-3 py-2 text-sm">Payment Transfer Charges</td>
                          <td className="px-3 py-2 text-right text-sm border-l border-black">35.00</td>
                          <td className="px-3 py-2 text-right text-sm border-l border-r border-black">1</td>
                          <td className="px-3 py-2 text-right text-sm border-l border-black">
                            {typeof invoice.payment_charges === 'number' ? invoice.payment_charges.toFixed(2) : Number(invoice.payment_charges ?? 0).toFixed(2)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* HSN/SAC and Export Note */}
                <div className="px-6 py-2 text-xs border-b border-black">
                  <div className="flex justify-between">
                    <div>HSN / SAC: {company?.hsn_sac || '998314'}</div>
                    <div className="text-right">SUPPLY/MENT FOR EXPORT UNDER LUT WITHOUT PAYMENT OF INTEGRATED TAX</div>
                  </div>
                </div>

                {/* Net Balance */}
                <div className="px-6 py-2 text-right font-bold text-sm border-b-2 border-black">
                  Net Balance Due: ${typeof invoice.total === 'number' ? invoice.total.toFixed(2) : Number(invoice.total || 0).toFixed(2)}
                </div>

                {/* Thank You Note */}
                <div className="px-6 py-2 text-center text-orange-700 text-sm border-b-2 border-black">
                  We appreciate your business, thank you ✓
                </div>

                {/* KA and Department */}
                <div className="px-6 py-1 text-xs">
                  KA: {company?.admin_name || 'Rahul Gangle'}<br />
                  {company?.admin_department || 'Billing Department'}, {company?.name || 'Mango IT Solutions'}
                </div>

                {/* Bank Details */}
                <div className="px-6 py-1 text-xs border-t border-b border-black">
                  Please wire as per bank details below & send SWIFT / bank advisory to {company?.email || 'accounts@mangoitsolutions.com'}
                </div>

                <div className=" px-6 py-2">
                  <table className="w-full text-xs">
                    <tbody>
                      <tr>
                        <td className="w-24 font-medium">For credit to:</td>
                        <td>{company?.name || 'Mango IT Solutions'}</td>
                      </tr>
                      <tr>
                        <td className="font-medium">Address:</td>
                        <td>{company?.address || '15/3, Old Palasia'}</td>
                      </tr>
                      <tr>
                        <td className="font-medium">Account number:</td>
                        <td>{bank?.account_number || 'XXXXXXXXXXXXXX'}</td>
                      </tr>
                      <tr>
                        <td className="font-medium">Account with:</td>
                        <td>{bank?.bank_name || 'XXXX Bank'}, India</td>
                      </tr>
                      <tr>
                        <td className="font-medium">Bank/Branch address:</td>
                        <td>{bank?.bank_address || 'Bank Address'}</td>
                      </tr>
                      <tr>
                        <td className="font-medium">SWIFT:</td>
                        <td>{bank?.swift_code || 'SWIFT Code'}</td>
                      </tr>
                      <tr>
                        <td className="font-medium">IFSC:</td>
                        <td>{bank?.ifsc_code || 'IFSC Code'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Footer Note */}
                <div className="px-6 py-2 text-xs text-center border-t border-b border-black">
                  Please note a late payment charge @ 2% per month will be levied on all invoices not paid within 7 days of due date.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Invoice Email</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="email-to">To</label>
                <Input
                  id="email-to"
                  value={emailForm.to}
                  onChange={e => setEmailForm(f => ({ ...f, to: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="email-subject">Subject</label>
                <Input
                  id="email-subject"
                  value={emailForm.subject}
                  onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="email-message">Message</label>
                <textarea
                  id="email-message"
                  className="w-full border rounded p-2"
                  rows={4}
                  value={emailForm.message}
                  onChange={e => setEmailForm(f => ({ ...f, message: e.target.value }))}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={sendEmail}>Send Email</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

function formatPeriod(period: string) {
  // Expecting format: 'YYYY-MM-DD - YYYY-MM-DD' or 'MM/DD/YYYY - MM/DD/YYYY' or similar
  const [from, to] = period.split(/\s*-\s*/);
  if (!from || !to) return period;
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return period;
  return `${ordinalDay(fromDate.getDate())} ${fromDate.toLocaleString('en-US', { month: 'short' })} ${fromDate.getFullYear().toString().slice(-2)} to ${ordinalDay(toDate.getDate())} ${toDate.toLocaleString('en-US', { month: 'short' })} ${toDate.getFullYear().toString().slice(-2)}`;
}

function ordinalDay(day: number) {
  if (day > 3 && day < 21) return day + 'th';
  switch (day % 10) {
    case 1: return day + 'st';
    case 2: return day + 'nd';
    case 3: return day + 'rd';
    default: return day + 'th';
  }
}