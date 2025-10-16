import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import mime from "mime-types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const filePath = path.join(process.cwd(), "uploads", "images", filename);

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Image not found", { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);

  // Dynamically set content type based on file extension
  const contentType = mime.lookup(filePath) || "application/octet-stream";

  return new NextResponse(fileBuffer, {
    headers: { "Content-Type": contentType },
  });
}
