"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfMonth } from "date-fns";
import { DateRangePicker } from "../ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { InvoiceDatePicker } from "../ui/invoice-date-picker";
import { ProjectDetails } from "@/database/models/interface";
import {
  DropdownMenu,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { Switch } from "@/components/ui/switch";

interface InvoiceItem {
  description: string;
  base_rate: number;
  unit: number;
  amount: number;
}

export default function GenerateInvoice() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [includePaymentCharges, setIncludePaymentCharges] = useState(false);
  const today = new Date();
  const defaultFrom = startOfMonth(today);
  const defaultTo = endOfMonth(today);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: defaultFrom,
    to: defaultTo,
  });
  const [formData, setFormData] = useState({
    user_id: user?.id?.toString() || "",
    client_name: "",
    client_company_name: "",
    client_address: "",
    client_email: "",
    invoice_date: new Date(),
    period: `${defaultFrom.toLocaleDateString()} - ${defaultTo.toLocaleDateString()}`,
    term: "",
    project_code: "",
  });
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", base_rate: 0, unit: 1, amount: 0 },
  ]);

  const [projects, setProjects] = useState<ProjectDetails[]>([]);

  // Add local state for placeholder visibility
  const [placeholderStates, setPlaceholderStates] = useState<{
    [key: string]: boolean;
  }>({});

  // recurring invoice state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<
    "once a month" | "twice a month" | null
  >(null);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      period: `${defaultFrom.toLocaleDateString()} - ${defaultTo.toLocaleDateString()}`,
    }));
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects);
        }
      } catch (e) {
        // Optionally handle error
      }
    }
    loadProjects();
  }, []);

  const addItem = () => {
    setItems([...items, { description: "", base_rate: 0, unit: 1, amount: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof InvoiceItem,
    value: string | number
  ) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Calculate amount when base_rate or unit changes
    if (field === "base_rate" || field === "unit") {
      updatedItems[index].amount =
        updatedItems[index].base_rate * updatedItems[index].unit;
    }

    setItems(updatedItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const paymentCharges = includePaymentCharges ? 35 : 0; // Fixed wire charges
    return subtotal + paymentCharges;
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      setFormData({
        ...formData,
        period: `${range.from.toLocaleDateString()} - ${range.to.toLocaleDateString()}`,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.user_id) {
      toast.error("Please select a user");
      return;
    }

    setIsLoading(true);

    try {
      const invoiceData = {
        ...formData,
        user_id: parseInt(formData.user_id),
        subtotal: calculateSubtotal(),
        payment_charges: includePaymentCharges ? 35 : 0,
        total: calculateTotal(),
        items: items.filter((item) => item.description.trim() !== ""),
        status: "draft",
        recurring_interval: isRecurring ? recurringInterval : null,
      };

      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invoiceData),
      });

      const data = await response.json();

      if (response.ok && data.invoiceId) {
        toast.success("Invoice generated successfully");
        router.push(`/invoice/${data.invoiceId}`);
        return;
      } else {
        toast.error(data.error || "Failed to generate invoice");
      }
    } catch (error) {
      toast.error("Network error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Generate Invoice</h1>
        <p className="text-gray-600">Create a new invoice for a user</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Invoice Details
          </CardTitle>
          <CardDescription>
            Fill in the invoice information and items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client Information */}
            <div>
              <Label htmlFor="project_code">Project Code</Label>
              <Select
                value={formData.project_code}
                onValueChange={(value) => {
                  const selected = projects.find(
                    (p) => p.project_code === value
                  );
                  setFormData({
                    ...formData,
                    project_code: value,
                    client_name: selected?.client_name || "",
                    client_company_name: selected?.company_name || "",
                    client_address: selected?.address || "",
                    client_email: selected?.client_email || "",
                  });
                }}
              >
                <SelectTrigger id="project_code">
                  <SelectValue placeholder="Select project code" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem
                      key={project.project_id}
                      value={project.project_code}
                    >
                      {project.project_code} - {project.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client_name">Client Name</Label>
                <Input
                  id="client_name"
                  value={formData.client_name}
                  onChange={(e) =>
                    setFormData({ ...formData, client_name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="client_email">Client Email</Label>
                <Input
                  id="client_email"
                  type="email"
                  value={formData.client_email}
                  onChange={(e) =>
                    setFormData({ ...formData, client_email: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="client_address">Client Address</Label>
              <Textarea
                id="client_address"
                value={formData.client_address}
                onChange={(e) =>
                  setFormData({ ...formData, client_address: e.target.value })
                }
                rows={3}
                required
              />
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="invoice_date">Invoice Date</Label>
                <InvoiceDatePicker />
              </div>
              <div className="md:col-span-2">
                <Label>Date Range (Period)</Label>
                <DateRangePicker
                  value={dateRange}
                  onChange={handleDateRangeChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="term">Term</Label>
                <Input
                  id="term"
                  value={formData.term}
                  onChange={(e) =>
                    setFormData({ ...formData, term: e.target.value })
                  }
                  placeholder="e.g., On receipt"
                />
              </div>
            </div>

            {/* Invoice Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Invoice Items</h3>
                <Button type="button" variant="outline" onClick={addItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg"
                >
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) =>
                        updateItem(index, "description", e.target.value)
                      }
                      placeholder="Item description"
                      required
                    />
                  </div>
                  <div>
                    <Label>Base Rate</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.base_rate}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "base_rate",
                          parseFloat(e.target.value)
                        )
                      }
                      placeholder={
                        placeholderStates[`base_rate_${index}`] === false
                          ? ""
                          : "0.00"
                      }
                      required
                      onFocus={() =>
                        setPlaceholderStates((s) => ({
                          ...s,
                          [`base_rate_${index}`]: false,
                        }))
                      }
                      onBlur={() =>
                        setPlaceholderStates((s) => ({
                          ...s,
                          [`base_rate_${index}`]: true,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Input
                      type="number"
                      step="1"
                      value={item.unit}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "unit",
                          parseFloat(e.target.value) || 1
                        )
                      }
                      placeholder={
                        placeholderStates[`unit_${index}`] === false ? "" : "1"
                      }
                      required
                      onFocus={() =>
                        setPlaceholderStates((s) => ({
                          ...s,
                          [`unit_${index}`]: false,
                        }))
                      }
                      onBlur={() =>
                        setPlaceholderStates((s) => ({
                          ...s,
                          [`unit_${index}`]: true,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.amount.toFixed(2)}
                        readOnly
                        className="bg-gray-50"
                      />
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Payment Charges */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="payment_charges"
                checked={includePaymentCharges}
                onCheckedChange={(checked) =>
                  setIncludePaymentCharges(checked === true)
                }
              />
              <Label htmlFor="payment_charges">
                Include Payment Transfer Charges ($35.00)
              </Label>
            </div>

            {/* Totals */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span>Subtotal:</span>
                <span className="font-medium">
                  ${calculateSubtotal().toFixed(2)}
                </span>
              </div>
              {includePaymentCharges && (
                <div className="flex justify-between items-center mb-2">
                  <span>Payment Charges:</span>
                  <span className="font-medium">$35.00</span>
                </div>
              )}
              <hr className="my-2" />
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total:</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Recurring Invoice</Label>
              <div className="flex items-center space-x-4">
                <Switch
                  checked={isRecurring}
                  onCheckedChange={(checked) => {
                    setIsRecurring(checked);
                    if (!checked) setRecurringInterval(null); // reset if turned off
                  }}
                />
                <span>{isRecurring ? "Yes" : "No"}</span>
              </div>

              {isRecurring && (
                <div className="mt-2">
                  <Label className="text-sm font-medium">
                    Recurring Interval
                  </Label>

                  <DropdownMenu>
                    <DropdownMenuTrigger className="px-3 py-2 border rounded-md text-sm w-full text-left">
                      {recurringInterval || "Select interval"}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-48">
                      <DropdownMenuRadioGroup
                        value={recurringInterval ?? ""}
                        onValueChange={(val) =>
                          setRecurringInterval(val as any)
                        }
                      >
                        <DropdownMenuRadioItem value="once a month">
                          Once a month
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="twice a month">
                          Twice a month
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Invoice
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
