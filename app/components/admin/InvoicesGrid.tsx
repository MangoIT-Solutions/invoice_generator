import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Mail, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// Add username to Invoice interface for admin
interface Invoice {
    id: number;
    invoice_number: string;
    client_name: string;
    client_email: string;
    total: number;
    status: string;
    invoice_date: string;
    created_at: string;
    username?: string; // <-- add this
}

export default function InvoicesGrid() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [emailForm, setEmailForm] = useState({ to: '', subject: '', message: '' });
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!user) return;
        fetchInvoices();
    }, [user]);

    const fetchInvoices = async () => {
        if (!user) return;
        try {
            const response = await fetch(user.role === 'admin' ? '/api/invoices' : '/api/invoices/user', {
                headers: user.role !== 'admin' ? { 'user-id': user.id?.toString() } : undefined
            });
            const data = await response.json();
            if (response.ok) {
                setInvoices(data.invoices || data);
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

    const openEmailDialog = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setEmailForm({
            to: invoice.client_email,
            subject: `Invoice #${invoice.invoice_number}`,
            message: 'Please find attached your invoice.'
        });
        setDialogOpen(true);
    };

    const handleSendEmail = async () => {
        if (!selectedInvoice) return;
        try {
            const response = await fetch(`/api/invoices/${selectedInvoice.id}/email`, {
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

    const handleDelete = async (invoiceId: number) => {
        if (!confirm('Are you sure you want to delete this invoice?')) return;
        try {
            const res = await fetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
            if (res.ok) {
                setInvoices(invoices.filter(inv => inv.id !== invoiceId));
                toast.success('Invoice deleted');
            } else {
                toast.error('Failed to delete invoice');
            }
        } catch {
            toast.error('Failed to delete invoice');
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">Loading...</div>
                    ) : invoices.length === 0 ? (
                        <div className="text-center py-8">No invoices found</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Invoice #</TableHead>
                                    <TableHead>Client</TableHead>
                                    {user?.role === 'admin' && <TableHead>User</TableHead>}
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Date</TableHead>
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
                                        {user?.role === 'admin' && (
                                            <TableCell>
                                                <span className="text-sm text-gray-700">{invoice.username || '-'}</span>
                                            </TableCell>
                                        )}
                                        <TableCell>${typeof invoice.total === 'number' ? invoice.total.toFixed(2) : Number(invoice.total || 0).toFixed(2)}</TableCell>

                                        <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <div className="flex space-x-2">
                                                <Button variant="outline" size="sm" onClick={() => router.push(`/invoice/${invoice.id}`)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => openEmailDialog(invoice)}>
                                                    <Mail className="h-4 w-4" />
                                                </Button>
                                                <Button variant="destructive" size="sm" onClick={() => handleDelete(invoice.id)}>
                                                    <Trash2 className="h-4 w-4" />
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
                                onChange={e => setEmailForm({ ...emailForm, to: e.target.value })}
                                placeholder="Recipient email"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" htmlFor="email-subject">Subject</label>
                            <Input
                                id="email-subject"
                                value={emailForm.subject}
                                onChange={e => setEmailForm({ ...emailForm, subject: e.target.value })}
                                placeholder="Email subject"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" htmlFor="email-message">Message</label>
                            <Textarea
                                id="email-message"
                                value={emailForm.message}
                                onChange={e => setEmailForm({ ...emailForm, message: e.target.value })}
                                placeholder="Email message"
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSendEmail}>Send Email</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
