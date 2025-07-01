import { NextRequest, NextResponse } from 'next/server';
import { getUserInvoices } from '@/lib/invoice';
import { initializeDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();
    
    // In a real app, you'd get the user ID from the session/token
    // For now, we'll get it from headers or return all invoices
    const userId = request.headers.get('user-id');
    
    if (!userId) {
      // Return empty array if no user ID
      return NextResponse.json({ invoices: [] });
    }

    const invoices = await getUserInvoices(parseInt(userId));
    return NextResponse.json({ invoices });
  } catch (error) {
    console.error('Error fetching user invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}