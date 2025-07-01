import { NextResponse } from 'next/server';
import { getAllProjects } from '@/lib/database';

export async function GET() {
    try {
        const projects = await getAllProjects();
        return NextResponse.json({ projects });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}
