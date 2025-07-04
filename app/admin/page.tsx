"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import AdminLayout from "@/app/components/AdminLayout";
import UserManagement from "@/app/components/admin/UserManagement";
import CompanyConfig from "@/app/components/admin/CompanyConfig";
import InvoiceConfig from "@/app/components/admin/InvoiceConfig";
import GenerateInvoice from "@/app/components/admin/GenerateInvoice";
import InvoicesGrid from "@/app/components/admin/InvoicesGrid";
import BankDetails from "@/app/components/admin/BankDetails";
import Authorization from "@/app/components/admin/Authorization";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("users");
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "users":
        return <UserManagement />;
      case "company":
        return <CompanyConfig />;
      case "bank":
        return <BankDetails />;
      case "invoice-config":
        return <InvoiceConfig />;
      case "generate":
        return <GenerateInvoice />;
      case "invoices":
        return <InvoicesGrid />;
      case "authorization":
        return <Authorization />;
      default:
        return <UserManagement />;
    }
  };

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </AdminLayout>
  );
}
