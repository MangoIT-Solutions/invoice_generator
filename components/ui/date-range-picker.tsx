import { DateRange } from 'react-day-picker';
import { useState, useRef } from 'react';
import { Calendar } from './calendar';
import { Popover, PopoverTrigger, PopoverContent } from './popover';
import { Input } from './input';

interface DateRangePickerProps {
    selected: DateRange | undefined;
    onSelect: (range: DateRange | undefined) => void;
}

export default function DateRangePicker({ selected, onSelect }: DateRangePickerProps) {
    const [range, setRange] = useState<DateRange | undefined>(selected);
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSelect = (newRange: DateRange | undefined) => {
        setRange(newRange);
        onSelect(newRange);
        // Close popover if both start and end are selected
        if (newRange && newRange.from && newRange.to) {
            setOpen(false);
        }
    };

    const inputLabel = range && range.from && range.to
        ? `${range.from.toLocaleDateString()} - ${range.to.toLocaleDateString()}`
        : '';

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Input
                    ref={inputRef}
                    readOnly
                    value={inputLabel}
                    onClick={() => setOpen(true)}
                    placeholder="Select period"
                />
            </PopoverTrigger>
            <PopoverContent align="start">
                <Calendar
                    mode="range"
                    selected={range}
                    onSelect={handleSelect}
                    numberOfMonths={1}
                    className="border rounded-lg shadow-sm"
                />
            </PopoverContent>
        </Popover>
    );
}
