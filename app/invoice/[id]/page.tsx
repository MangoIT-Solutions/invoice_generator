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
              className="bg-white  border-2 border-gray-900 rounded-md"
              style={{ boxSizing: 'border-box' }}
            >
              {/* Header */}
              <div className="border-b-2 border-gray-900 pb-6 mb-6 p-2">
                <div className="flex justify-between items-start">
                  {/* Logo on the left */}
                  <div className="flex-shrink-0 flex flex-col items-start justify-start w-1/3">
                    {company?.company_logo && (
                      <img
                        src={company.company_logo.startsWith('uploads/') || company.company_logo.startsWith('/uploads/') ? `/` + company.company_logo.replace(/^\/+/, '') : `/uploads/${company.company_logo.replace(/^\/+/, '')}`}
                        alt="Company Logo"
                        className="mb-2 max-h-16 max-w-xs object-contain"
                        style={{ background: '#fff', borderRadius: 4, border: '1px solid #eee', padding: 4 }}
                      />
                    )}
                  </div>
                  {/* Company Info on the right, but left-aligned content */}
                  <div className="flex-1 ml-6 text-left ">
                    <div className='main-title' >
                      <h1 className="text-2xl font-bold text-gray-900 mt-2">{company?.name || 'MANGO IT SOLUTIONS'}</h1>
                      <p className="text-sm text-gray-600">a web & mobile dev company</p>
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      <p>{company?.address || '15/3 Old Palasia, Behind Sarda House, Indore 452 001 INDIA'}</p>
                      <p>{company?.contact || '+91-731-4044117'} / {company?.email || 'accounts@mangoitsolutions.com'}</p>
                      <p>GSTIN-23ADUPS9604H1Z1</p>
                    </div>
                  </div>
                </div>
                {/* Invoice Title Centered Below */}
                <div className="flex justify-center mt-4">
                  <h2 className="text-lg font-semibold text-center">Software Service Invoice</h2>
                </div>
              </div>

              {/* Invoice Details - split left/right */}
              <div className="mb-6 flex flex-row gap-8 p-2">
                {/* Left: Bill To (client info) */}
                <div className="flex-1 text-left">
                  <h3 className="font-small mb-2">Bill To</h3>
                  <div className="text-sm mb-2">
                    <p className="font-medium">{invoice.client_company_name || invoice.client_name}</p>
                    <p>{invoice.client_address?.replace(/\n|\r/g, ', ')}</p>
                  </div>
                  <div className="text-sm mb-2">
                    <p className="flex-1 mb-2 font-small">KA: <strong>{invoice.client_name} </strong> | Email: {invoice.client_email}</p>
                  </div>
                </div>
                {/* Right: Invoice Info */}
                <div className="flex-1 text-left">
                  <div className="text-sm space-y-1">
                    <div>Date: {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-') : ''}</div>
                    <div>Invoice No.: {invoice.invoice_number}</div>
                    <div>Period: {invoice.period ? formatPeriod(invoice.period) : 'N/A'}</div>
                    <div>Term: {invoice.term || 'On receipt'}</div>
                    <div>Project code: {invoice.project_code || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-6">
                <table className="w-full border border-l-0 border-r-0 border-gray-900">
                  <thead>
                    <tr className="">
                      <th className="border border-r-0 border-l-0 border-gray-900 px-4 py-2 text-left align-bottom" rowSpan={2}>Description</th>
                      <th className="border border-gray-900 px-4 py-2 text-center" colSpan={2}>Rate</th>
                      <th className="border border-gray-900 border-r-0 px-4 py-2 text-right align-bottom" rowSpan={2}>Amount USD</th>
                    </tr>
                    <tr className="">
                      <th className="border border-gray-900 px-4 py-2 text-center">Base</th>
                      <th className="border border-gray-900 px-4 py-2 text-center">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td className="border border-gray-900 border-l-0 px-4 py-2">{item.description}</td>
                        <td className="border border-gray-900 px-4 py-2 text-center">{item.base_rate}</td>
                        <td className="border border-gray-900 px-4 py-2 text-center">{item.unit}</td>
                        <td className="border border-gray-900 border-r-0 px-4 py-2 text-right">{typeof item.amount === 'number' ? item.amount.toFixed(2) : Number(item.amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                    {invoice.payment_charges > 0 && (
                      <tr>
                        <td className="border border-gray-900 border-l-0 px-4 py-2">Payment Transfer Charges</td>
                        <td className="border border-gray-900 px-4 py-2 text-center">35</td>
                        <td className="border border-gray-900 px-4 py-2 text-center">1.00</td>
                        <td className="border border-gray-900 border-r-0 px-4 py-2 text-right">{invoice.payment_charges}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Total */}
              HSN / SAC: 998314
              SUPPLY MEANT FOR EXPORT UNDER LUT WITHOUT PAYMENT OF INTEGRATED TAX
              <div className="text-right mb-6 p-2">
                <div className="inline-block">
                  <div className="flex justify-between items-center min-w-48">
                    <span className="font-semibold">Net Balance Due</span>
                    <span className="font-bold text-lg ml-8">${typeof invoice.total === 'number' ? invoice.total.toFixed(2) : Number(invoice.total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-900 pt-4">
                <p className="text-sm mb-4">We appreciate your business, thank you</p>
                <div className="text-sm mb-2">
                  <p className="font-medium">KA: {company?.admin_name || 'Rahul Gangle'}</p>
                  <p>{company?.admin_department || 'Billing Department'}, {company?.name || 'Mango IT Solutions'}</p>
                </div>
              </div>
              <div className="border-t border-gray-900 pt-4">
                <div className="mt-4 text-sm">
                  <p>Please wire as per bank details below & send SWIFT / bank advisory to {company?.email || 'accounts@mangoitsolutions.com'}</p>
                  <table className="mt-2">
                    <tbody>
                      <tr>
                        <td><strong>For credit to:</strong></td>
                        <td>{company?.name || 'Mango IT Solutions'}</td>
                      </tr>
                      <tr>
                        <td><strong>Address:</strong></td>
                        <td>{company?.address || '15/3, Old Palasia'}</td>
                      </tr>
                      <tr>
                        <td><strong>Account number:</strong></td>
                        <td>{bank?.account_number || 'XXXXXXXXXXXXXX'}</td>
                      </tr>
                      <tr>
                        <td><strong>Account with:</strong></td>
                        <td>{bank?.bank_name || 'XXXX Bank'}, India</td>
                      </tr>
                      <tr>
                        <td><strong>Bank/Branch address:</strong></td>
                        <td>{bank?.bank_address || 'Bank Address'}</td>
                      </tr>
                      <tr>
                        <td><strong>SWIFT:</strong></td>
                        <td>{bank?.swift_code || 'XXXXXXXX'}</td>
                      </tr>
                      <tr>
                        <td><strong>IFSC CODE:</strong></td>
                        <td>{bank?.ifsc_code || 'XXXXXXXXX'}</td>
                      </tr>
                      <tr>
                        <td><strong>Bank Wire Charges:</strong></td>
                        <td>On client side</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 text-xs border-gray-900 border-t p-2">
                  <p>Late payments charges, if paid later than 7days per terms, @ 1.5% monthly interest or USD 35, whichever is greater</p>
                </div>
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
  );

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
}