'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Mail, Eye, LogOut, Plus } from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '@/app/components/admin/AdminLayout';
import GenerateInvoice from '@/app/components/admin/GenerateInvoice';
import InvoicesGrid from '@/app/components/admin/InvoicesGrid';

interface Invoice {
  id: number;
  invoice_number: string;
  client_name: string;
  client_email: string;
  total: number;
  status: string;
  invoice_date: string;
  created_at: string;
}

export default function UserDashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user || user.role === 'admin') {
      router.push('/');
      return;
    }
    fetchInvoices();
  }, [user, router]);

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/invoices/user');
      const data = await response.json();
      if (response.ok) {
        setInvoices(data.invoices);
      }
    } catch (error) {
      toast.error('Failed to fetch invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async (invoiceId: number) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  const handleSendEmail = async (invoiceId: number) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/email`, {
        method: 'POST'
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Invoice sent successfully');
      } else {
        toast.error(data.error || 'Failed to send invoice');
      }
    } catch (error) {
      toast.error('Failed to send email');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || user.role === 'admin') {
    router.push('/');
    return null;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'generate':
        return <GenerateInvoice />;
      case 'invoices':
        return <InvoicesGrid />;
      case 'dashboard':
      default:
        return (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                      <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                      <div className="h-4 w-4 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Paid</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {invoices.filter(inv => inv.status === 'paid').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <div className="h-4 w-4 bg-yellow-500 rounded-full"></div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {invoices.filter(inv => inv.status === 'sent').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <div className="h-4 w-4 bg-gray-500 rounded-full"></div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Draft</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {invoices.filter(inv => inv.status === 'draft').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Invoices Table */}
            <Card>
              <CardHeader>
                <CardTitle>Your Invoices</CardTitle>
                <CardDescription>
                  Manage and track all your invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No invoices found</p>
                    <p className="text-sm text-gray-400">Your invoices will appear here when created by admin</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">#{invoice.invoice_number}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{invoice.client_name}</p>
                              <p className="text-sm text-gray-500">{invoice.client_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>${invoice.total.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={
                              invoice.status === 'paid' ? 'default' :
                                invoice.status === 'sent' ? 'secondary' :
                                  'outline'
                            }>
                              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/invoice/${invoice.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadPDF(invoice.id)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendEmail(invoice.id)}
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </AdminLayout>
  );
}