import { NextRequest, NextResponse } from 'next/server';
import { getCompanyConfig, updateCompanyConfig } from '@/lib/invoice';
import { initializeDatabase } from '@/lib/database';

export async function GET() {
  try {
    await initializeDatabase();
    const company = await getCompanyConfig();
    return NextResponse.json({ company });
  } catch (error) {
    console.error('Error fetching company config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();
    
    const data = await request.json();
    await updateCompanyConfig(data);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating company config:', error);
    return NextResponse.json(
      { error: 'Failed to update company configuration' },
      { status: 500 }
    );
  }
}