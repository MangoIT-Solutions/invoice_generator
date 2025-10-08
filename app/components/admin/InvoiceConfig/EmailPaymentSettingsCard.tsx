"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function EmailPaymentSettingsCard({ formData, handleChange }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="mr-2 h-5 w-5" />
          Email & Payment Settings
        </CardTitle>
        <CardDescription>
          Configure allowed request emails, reminder days, and margin amount
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Emails */}
          <div className="col-span-2">
            <Label htmlFor="invoiceRequestEmailAllowed">
              Allowed Request Emails
            </Label>
            <textarea
              id="invoiceRequestEmailAllowed"
              name="invoiceRequestEmailAllowed"
              className="w-full border rounded-md p-2 mt-1"
              rows={3}
              placeholder="abc@example.com, xyz@example.com"
              value={formData.invoiceRequestEmailAllowed || ""}
              onChange={handleChange}
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              Enter one or more allowed emails, comma-separated.
            </p>
          </div>

          {/* Reminder Days */}
          <div>
            <Label htmlFor="upaidInvoiceReminderDays">Reminder Days</Label>
            <Input
              id="upaidInvoiceReminderDays"
              name="upaidInvoiceReminderDays"
              type="number"
              value={formData.upaidInvoiceReminderDays || ""}
              onChange={handleChange}
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              Number of days after which unpaid invoice reminders are sent.
            </p>
          </div>

          {/* Margin Amount */}
          <div>
            <Label htmlFor="marginAmountForUnduePayment">Margin Amount</Label>
            <textarea
              id="marginAmountForUnduePayment"
              name="marginAmountForUnduePayment"
              className="w-full px-3 py-2 mt-0 h-10 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={1}
              placeholder="Enter margin amount..."
              value={formData.marginAmountForUnduePayment || ""}
              onChange={handleChange}
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              Amount threshold for overdue payment slack/adjustment.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
