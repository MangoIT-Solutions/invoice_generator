import { NextRequest, NextResponse } from 'next/server';
import { initDB } from '@/database/db';
import { Invoice } from '@/model/invoice.model';
import { InvoiceItem } from '@/model/invoice-item.model';
import { User } from '@/model/user.model';

export async function GET(request: NextRequest) {
  try {
    await initDB();

    const userId = request.headers.get('user-id');
    if (!userId) {
      return NextResponse.json({ invoices: [] });
    }

    const invoices = await Invoice.findAll({
      where: { user_id: parseInt(userId) },
      include: [
        {
          model: InvoiceItem,
          as: 'items',
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error('Error fetching user invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
