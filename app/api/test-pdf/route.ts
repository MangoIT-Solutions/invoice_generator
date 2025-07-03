import { NextResponse } from 'next/server';
import { generateInvoicePdf } from '@/lib/invoicePdf';
import { initializeDatabase } from '@/lib/database';

export async function GET() {
  try {
    await initializeDatabase();
    
    // Test data that matches the expected structure
    const testInvoice = {
      id: 1,
      invoice_number: 'TEST-001',
      client_name: 'Test Client',
      client_company_name: 'Test Company',
      client_address: '123 Test St, Test City',
      client_email: 'test@example.com',
      invoice_date: new Date().toISOString().split('T')[0],
      period: 'January 2023',
      term: 'Net 30',
      project_code: 'TEST-123',
      subtotal: 1000,
      payment_charges: 50,
      total: 1050,
      status: 'draft',
      items: [
        {
          id: 1,
          description: 'Test Service',
          base_rate: 1000,
          unit: 1,
          amount: 1000
        }
      ]
    };

    const testCompany = {
      id: 1,
      name: 'Test Company',
      logo: '/logo.png',
      address: '123 Business St, Business City',
      email: 'billing@testcompany.com',
      contact: '+1 234 567 8900',
      admin_name: 'John Doe',
      admin_department: 'Billing',
      hsn_sac: '12345678'
    };

    const testBank = {
      id: 1,
      account_number: '1234567890',
      bank_name: 'Test Bank',
      bank_address: '456 Bank St, Bank City',
      swift_code: 'TESTUS33',
      ifsc_code: 'TEST0123456',
      wire_charges: 'On client side'
    };

    const pdfPath = await generateInvoicePdf(
      testInvoice,
      testCompany,
      testBank,
      'test-invoice.pdf'
    );

    return NextResponse.json({
      success: true,
      message: 'Test PDF generated successfully',
      path: pdfPath
    });
  } catch (error) {
    console.error('Error generating test PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate test PDF', details: String(error) },
      { status: 500 }
    );
  }
}
