import { NextRequest, NextResponse } from 'next/server';
import { getCompanyConfig, updateCompanyConfig } from '@/services/company.service';
import { initDB } from '@/database/db';

export async function GET() {
  try {
    await initDB();
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
    await initDB();
    
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