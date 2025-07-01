import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format invoice period string (e.g., '2024-05') to 'May 2024'
// Format invoice period string (e.g., '2025-05') to '01-May-25 to 31-May-25'
/**
 * Formats a date object into a M/D/YYYY string.
 * e.g., new Date('2025-05-01') => "5/1/2025"
 */
/**
 * Formats a date object into a M/D/YYYY string.
 * e.g., new Date('2025-05-01') => "5/1/2025"
 */
export function formatDateToMDY(date: Date): string {
    if (!date || isNaN(date.getTime())) {
        return '';
    }
    // Use UTC methods to avoid timezone issues
    const month = date.getUTCMonth() + 1; // getUTCMonth() is 0-indexed
    const day = date.getUTCDate();
    const year = date.getUTCFullYear();
    return `${month}/${day}/${year}`;
}

/**
 * Formats an invoice period string into a 'M/D/YYYY - M/D/YYYY' range.
 * It can handle three primary input formats:
 * 1. A month string: "2025-05"
 * 2. A date range string with 'to': "2025-05-01 to 2025-05-31"
 * 3. A date range string with '-': "2025-05-01 - 2025-05-31"
 * Any other format will be returned as is.
 */
export function formatPeriod(period: string): string {
  if (!period) {
    return 'N/A';
  }
  const trimmedPeriod = period.trim();

  // First, check if the period is already in the desired M/D/YYYY format (range or single).
  if (/^(\d{1,2}\/\d{1,2}\/\d{4})( - \d{1,2}\/\d{1,2}\/\d{4})?$/.test(trimmedPeriod)) {
    return trimmedPeriod;
  }

  // Case 1: Handle month strings, e.g., "2025-05"
  if (/^\d{4}-\d{2}$/.test(trimmedPeriod)) {
    const [year, month] = trimmedPeriod.split('-').map(Number);
    if (year > 1000 && month >= 1 && month <= 12) {
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0));
      return `${formatDateToMDY(startDate)} - ${formatDateToMDY(endDate)}`;
    }
  }

  // Case 2: Handle date range strings, e.g., "2025-05-01 to 2025-05-31"
  const separator = / to | - /;
  if (separator.test(trimmedPeriod)) {
    const parts = trimmedPeriod.split(separator);
    // Ensure it's a range of two YYYY-MM-DD dates.
    if (parts.length === 2 && /^\d{4}-\d{2}-\d{2}$/.test(parts[0].trim()) && /^\d{4}-\d{2}-\d{2}$/.test(parts[1].trim())) {
      try {
        const startDate = new Date(parts[0].trim() + 'T00:00:00Z');
        const endDate = new Date(parts[1].trim() + 'T00:00:00Z');
        
        const formattedStart = formatDateToMDY(startDate);
        const formattedEnd = formatDateToMDY(endDate);

        if (formattedStart && formattedEnd) {
          return `${formattedStart} - ${formattedEnd}`;
        }
      } catch (error) {
        console.error('Error parsing period date range:', error);
      }
    }
  }

  // Case 3: Handle single YYYY-MM-DD date
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

  // If the format is not recognized or parsing failed, return the original string.
  return trimmedPeriod;
}
