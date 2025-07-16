import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, createUser } from '@/services/auth.service';
import { initDB } from '@/database/db';

export async function GET() {
  try {
    await initDB();
    const users = await getAllUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDB();
    
    const { username, email, password, role } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const userId = await createUser(username, email, password, role);
    return NextResponse.json({ success: true, userId });
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}