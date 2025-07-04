import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/database';
// @ts-ignore - bcryptjs has type issues in some versions
import bcrypt from 'bcryptjs';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: number }> }): Promise<NextResponse> {
  try {
    const { id } = await params;
    const { username, email, password, role } = await req.json();

    if (!username || !email) {
      return NextResponse.json(
        { error: 'Username and email are required' },
        { status: 400 }
      );
    }

    let updateQuery = 'UPDATE users SET username = ?, email = ?, role = ? WHERE id = ?';
    let args = [username, email, role, id];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery = 'UPDATE users SET username = ?, email = ?, password = ?, role = ? WHERE id = ?';
      args = [username, email, hashedPassword, role, id];
    }

    await client.execute({
      sql: updateQuery,
      args
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating user:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: number }> }): Promise<NextResponse> {
  try {
    const { id } = await params;

    await client.execute({
      sql: 'DELETE FROM users WHERE id = ? AND role != "admin"',
      args: [id]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}