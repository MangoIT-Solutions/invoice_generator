import { NextRequest, NextResponse } from "next/server";
import {
  getInvoiceWithItems,
  getCompanyConfig,
  getBankDetails,
} from "@/services/invoice.service";
import { initDB } from "@/database/db";
import { Invoice } from "@/database/models/invoice.model"; // ✅ Use Sequelize model

// ✅ GET /api/invoice/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: number }> }
) {
  try {
    await initDB();

    const { id } = await params;
    const invoiceData = await getInvoiceWithItems(Number(id));
    if (!invoiceData) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const company = await getCompanyConfig();
    const bank = await getBankDetails();

    return NextResponse.json({
      ...invoiceData,
      company,
      bank,
    });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

// ✅ DELETE /api/invoice/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: number }> }
) {
  try {
    await initDB();

    const { id } = await params;

    const deletedCount = await Invoice.destroy({
      where: { id: Number(id) },
    });

    if (deletedCount === 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}
