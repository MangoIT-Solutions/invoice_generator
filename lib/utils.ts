import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a Date object into "DD-MMM-YY" string.
 * e.g. new Date('2025-07-14') => "14-Jul-25"
 */
export function formatDateToMDY(date: Date): string {
  if (!date || isNaN(date.getTime())) {
    return '';
  }

  // Use UTC to avoid timezone issues
  const day = date.getUTCDate().toString().padStart(2, '0'); // zero-padded day
  const month = date.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }); // "Jan", "Feb", etc.
  const year = date.getUTCFullYear().toString().slice(-2); // last two digits of year

  return `${day}-${month}-${year}`;
}

/**
 * Formats an invoice period string into a 'DD-MMM-YY to DD-MMM-YY' range or a single date.
 * Handles inputs:
 *  - Month string "YYYY-MM" => "01-MMM-YY to lastDay-MMM-YY"
 *  - Date range "YYYY-MM-DD to YYYY-MM-DD" or "YYYY-MM-DD - YYYY-MM-DD"
 *  - Single date "YYYY-MM-DD"
 * Returns 'N/A' if empty or undefined.
 * Otherwise returns formatted string or original string if unrecognized.
 */
export function formatPeriod(period: string): string {
  if (!period) {
    return 'N/A';
  }

  const trimmedPeriod = period.trim();

  // Case 1: Month string "YYYY-MM"
  if (/^\d{4}-\d{2}$/.test(trimmedPeriod)) {
    const [year, month] = trimmedPeriod.split('-').map(Number);
    if (year > 1000 && month >= 1 && month <= 12) {
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0)); // last day of the month
      return `${formatDateToMDY(startDate)} to ${formatDateToMDY(endDate)}`;
    }
  }

  // Case 2: Date range "YYYY-MM-DD to YYYY-MM-DD" or "YYYY-MM-DD - YYYY-MM-DD"
  const isoSeparator = / to | - /;
  if (isoSeparator.test(trimmedPeriod)) {
    const parts = trimmedPeriod.split(isoSeparator);
    if (
      parts.length === 2 &&
      /^\d{4}-\d{2}-\d{2}$/.test(parts[0].trim()) &&
      /^\d{4}-\d{2}-\d{2}$/.test(parts[1].trim())
    ) {
      try {
        const startDate = new Date(parts[0].trim() + 'T00:00:00Z');
        const endDate = new Date(parts[1].trim() + 'T00:00:00Z');
        return `${formatDateToMDY(startDate)} to ${formatDateToMDY(endDate)}`;
      } catch (error) {
        console.error('Error parsing ISO period range:', error);
      }
    }
  }

  // Case 3: Date range "DD/MM/YYYY - DD/MM/YYYY"
  const slashSeparator = / ?- ?/;
  if (slashSeparator.test(trimmedPeriod)) {
    const parts = trimmedPeriod.split(slashSeparator);
    if (
      parts.length === 2 &&
      /^\d{2}\/\d{2}\/\d{4}$/.test(parts[0].trim()) &&
      /^\d{2}\/\d{2}\/\d{4}$/.test(parts[1].trim())
    ) {
      try {
        const parseDMY = (dmy: string): Date => {
          const [day, month, year] = dmy.split('/').map(Number);
          return new Date(Date.UTC(year, month - 1, day));
        };

        const startDate = parseDMY(parts[0].trim());
        const endDate = parseDMY(parts[1].trim());

        return `${formatDateToMDY(startDate)} to ${formatDateToMDY(endDate)}`;
      } catch (error) {
        console.error('Error parsing DMY period range:', error);
      }
    }
  }

  // Case 4: Single date "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedPeriod)) {
    try {
      const date = new Date(trimmedPeriod + 'T00:00:00Z');
      if (!isNaN(date.getTime())) {
        return formatDateToMDY(date);
      }
    } catch (error) {
      console.error('Error parsing single period date:', error);
    }
  }

  // Fallback: return original string
  return trimmedPeriod;
}

