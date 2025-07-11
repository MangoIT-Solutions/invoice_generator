'use client';
import React from 'react';
import AdminLayout from '@/app/components/AdminLayout';
import InvoicesGrid from '@/app/components/admin/InvoicesGrid';

export default function AdminInvoicesPage() {
    const [activeTab, setActiveTab] = React.useState('invoices');
    return (
        <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
            <InvoicesGrid />
        </AdminLayout>
    );
}

