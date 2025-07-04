import { NextRequest, NextResponse } from 'next/server';
import { getBankDetails, updateBankDetails } from '@/lib/invoice';
import { initializeDatabase } from '@/lib/database';

export async function GET() {
  try {
    await initializeDatabase();
    const bank = await getBankDetails();
    return NextResponse.json({ bank });
  } catch (error) {
    console.error('Error fetching bank details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bank details' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();
    
    const data = await request.json();
    await updateBankDetails(data);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating bank details:', error);
    return NextResponse.json(
      { error: 'Failed to update bank details' },
      { status: 500 }
    );
  }
}