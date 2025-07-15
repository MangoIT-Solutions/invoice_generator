import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { User } from '@/model/user.model';
import { Op } from 'sequelize';

// PUT /api/users/:id
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: number }> }): Promise<NextResponse> {
  try {
    const {id} = await params;
    const { username, email, password, role } = await req.json();

    if (!username || !email) {
      return NextResponse.json(
        { error: 'Username and email are required' },
        { status: 400 }
      );
    }

    // Prepare update fields
    const updateData: any = { username, email, role };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const [updatedCount] = await User.update(updateData, {
      where: { id },
    });

    if (updatedCount === 0) {
      return NextResponse.json(
        { error: 'User not found or no changes made' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating user:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE /api/users/:id
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: number }> }): Promise<NextResponse> {
  try {
    const {id} = await params;
    const deletedCount = await User.destroy({
      where: {
        id,
        role: { [Op.ne]: 'admin' }, // Do not delete admin users
      },
    });
    console.log("deletedCount", deletedCount);
    if (deletedCount === 0) {
      return NextResponse.json(
        { error: 'User not found or is an admin' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
