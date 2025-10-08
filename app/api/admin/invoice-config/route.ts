import { NextRequest, NextResponse } from "next/server";
import { initDB } from "@/database/db";
import Config from "@/database/models/config.model";
import { Op } from "sequelize";

export async function GET() {
  try {
    await initDB();

    const configs = await Config.findAll();

    // Convert array of key-value rows into object
    const configObject = configs.reduce(
      (acc: Record<string, string>, item: any) => {
        acc[item.keyIndex] = item.value;
        return acc;
      },
      {}
    );

    return NextResponse.json({ config: configObject });
  } catch (error) {
    console.error("Error fetching invoice config:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice configuration" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDB();

    // Step 1: Parse and validate request body
    const body = await request.json();

    const starting_number = Number(body.starting_number) || 1000;
    const current_number = Number(body.current_number) || 1000;
    const invoiceRequestEmailAllowed = body.invoiceRequestEmailAllowed || "";
    const upaidInvoiceReminderDays = Number(body.upaidInvoiceReminderDays) || 0;
    const marginAmountRaw = body.marginAmountForUnduePayment;

    const marginAmountNumber = Number(marginAmountRaw);

    if (isNaN(marginAmountNumber)) {
      return NextResponse.json(
        { error: "Margin Amount must be a valid number or decimal" },
        { status: 400 }
      );
    }

    const marginAmountForUnduePayment = marginAmountNumber.toFixed(2);

    // Step 3: Reusable upsert function for config table
    const upsertConfig = async (keyIndex: string, value: string) => {
      const existing = await Config.findOne({ where: { keyIndex } });

      if (existing) {
        await existing.update({ value });
      } else {
        await Config.create({ keyIndex, value });
      }
    };

    // Step 2: Upsert invoice_config (single row only)
    const existingInvoiceConfig = await Config.findOne();
    if (existingInvoiceConfig) {
      await upsertConfig("starting_number", String(starting_number));
      await upsertConfig("current_number", String(current_number));
      await upsertConfig(
        "invoiceRequestEmailAllowed",
        invoiceRequestEmailAllowed
      );
      await upsertConfig(
        "upaidInvoiceReminderDays",
        String(upaidInvoiceReminderDays)
      );
      await upsertConfig(
        "marginAmountForUnduePayment",
        marginAmountForUnduePayment
      );
    } else {
      await Config.create({ starting_number, current_number });
    }

    // Step 4: Store configs
    await upsertConfig(
      "invoiceRequestEmailAllowed",
      invoiceRequestEmailAllowed
    );
    await upsertConfig(
      "upaidInvoiceReminderDays",
      String(upaidInvoiceReminderDays)
    );
    await upsertConfig(
      "marginAmountForUnduePayment",
      marginAmountForUnduePayment
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating invoice config:", error);
    return NextResponse.json(
      { error: "Failed to update invoice configuration" },
      { status: 500 }
    );
  }
}
