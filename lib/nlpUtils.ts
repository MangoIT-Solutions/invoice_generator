interface ParsedInput {
  projectCode?: string;
  clientName?: string;
  period?: string;
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
}

export function parseNaturalInput(input: string): Partial<ParsedInput> {
  const result: Partial<ParsedInput> = { items: [] };
  
  // Extract project code and client name
  const projectMatch = input.match(/(?:project|proj|prj)\s+([a-z0-9-]+)/i) || 
                     input.match(/for\s+([a-z0-9-]+(?:\s+[a-z0-9-]+)*)/i);
  
  if (projectMatch) {
    result.projectCode = projectMatch[1].trim();
  }

  // Extract client name (after 'for' or 'client' or 'customer')
  const clientMatch = input.match(/(?:client|customer|for)\s+([a-z0-9-]+(?:\s+[a-z0-9-]+)*)/i);
  if (clientMatch) {
    result.clientName = clientMatch[1].trim();
  }

  // Extract date periods
  const datePatterns = [
    // Month Year (May 2023)
    /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}/i,
    // Month Day - Day (May 1-31)
    /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d+\s*-\s*\d+/i,
    // Full date range (May 1, 2023 - May 31, 2023)
    /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d+,\s*\d{4}\s*-\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d+,\s*\d{4}/i,
    // Just year (2023)
    /\b(20\d{2})\b/
  ];

  for (const pattern of datePatterns) {
    const match = input.match(pattern);
    if (match) {
      result.period = match[0];
      break;
    }
  }

  // Extract invoice items with various formats
  const itemPatterns = [
    // Format: 2 hours dev @ $50
    /(\d+(\.\d+)?)\s*(?:hrs?|hours?)\s+(?:of\s+)?([^@$]+?)\s*(?:@|at|for)?\s*\$?(\d+(\.\d+)?)/gi,
    // Format: Dev work - 5 hrs - $75/hr
    /([^-]+?)\s*-\s*(\d+(\.\d+)?)\s*(?:hrs?|hours?)\s*-\s*\$?(\d+(\.\d+)?)/gi,
    // Format: 3 x Design @ $100
    /(\d+)\s*x\s*([^@]+?)\s*@\s*\$?(\d+(\.\d+)?)/gi,
  ];

  for (const pattern of itemPatterns) {
    let match;
    while ((match = pattern.exec(input)) !== null) {
      const quantity = parseFloat(match[1]);
      const description = match[2]?.trim();
      const rate = parseFloat(match[3]);
      
      if (description && !isNaN(quantity) && !isNaN(rate)) {
        result.items!.push({
          description,
          quantity,
          rate,
          amount: quantity * rate
        });
      }
    }
  }

  return result;
}

// Helper to format date strings consistently
export function formatDateString(dateStr: string): string {
  // Try to parse various date formats and return YYYY-MM-DD
  // This is a simplified version - you might want to use a library like date-fns or moment.js
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  return dateStr; // Return original if can't parse
}
