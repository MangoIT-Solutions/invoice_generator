import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        await fs.mkdir(uploadsDir, { recursive: true });
        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const filepath = path.join(uploadsDir, filename);
        await fs.writeFile(filepath, new Uint8Array(buffer));
        const url = `/uploads/${filename}`;
        return NextResponse.json({ url });
    } catch (error) {
        console.error('Logo upload error:', error);
        return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
    }
}
