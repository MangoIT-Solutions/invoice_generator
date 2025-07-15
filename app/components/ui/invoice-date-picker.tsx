import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function InvoiceDatePicker() {
  const [invoiceDate, setInvoiceDate] = React.useState<Date | undefined>(new Date())

  return (
    <div className="grid gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[280px] justify-start text-left font-normal",
              !invoiceDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {invoiceDate ? format(invoiceDate, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={invoiceDate}
            onSelect={setInvoiceDate}
            initialFocus
            captionLayout="dropdown"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
