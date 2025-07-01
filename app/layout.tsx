import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import ChatbotPortal from '@/components/ChatbotPortal';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Invoice Manager - Professional Invoice Management System',
  description: 'Complete invoice management system with admin controls and user dashboards',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster />
            <ChatbotPortal />
        </AuthProvider>
      </body>
    </html>
  );
}