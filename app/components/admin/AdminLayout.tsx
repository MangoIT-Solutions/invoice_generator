'use client';

import { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Settings,
  Users,
  Building2,
  FileText,
  LogOut,
  Menu,
  X,
  CreditCard
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function AdminLayout({ children, activeTab, onTabChange }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const menuItems = [
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'company', label: 'Company Config', icon: Building2 },
    { id: 'bank', label: 'Bank Details', icon: CreditCard }, // Restored Bank Details menu item
    { id: 'invoice-config', label: 'Invoice Config', icon: Settings },
    { id: 'generate', label: 'Generate Invoice', icon: FileText },
    { id: 'invoices', label: 'Invoices', icon: FileText }, // New menu item
    {id: 'authorization', label: 'Authorization', icon: Settings} // New menu item
  ];

  // Only show 'User Management' if user is admin, and only show 'Generate Invoice' if user is a regular user
  let filteredMenuItems: typeof menuItems = [];
  if (user?.role === 'admin') {
    filteredMenuItems = menuItems;
  } else if (user?.role === 'user') {
    filteredMenuItems = menuItems.filter(item => item.id === 'generate' || item.id === 'invoices');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="mt-6">
          <div className="px-3">
            {filteredMenuItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  className="w-full justify-start mb-1"
                  onClick={() => onTabChange(item.id)}
                >
                  <IconComponent className="mr-3 h-5 w-5" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.username?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">{user?.username}</p>
              <p className="text-xs text-gray-500">{user?.role === 'admin' ? 'Administrator' : 'User'}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold text-gray-800">
            {menuItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
          </h2>
        </div>

        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}