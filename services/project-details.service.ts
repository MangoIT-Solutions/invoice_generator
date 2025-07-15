import { ProjectDetail } from '@/model/project.model';
import { ProjectDetails } from '@/model';

export async function getProjectDetails(projectCode: string): Promise<ProjectDetails | null> {
  try {
    const project = await ProjectDetail.findOne({
      where: { project_code: projectCode },
    });

    return project ? project.get() : null;
  } catch (error) {
    console.error('Error fetching project details:', error);
    return null;
  }
}


// Core interfaces
export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount?: number;
}

export interface ParsedInvoiceInput {
  projectCode?: string;
  clientName?: string;
  period?: string;
  items: InvoiceItem[];
  transactionCharges?: number;
}

type WorkLogAction =
  | 'log_work'
  | 'collect_email'
  | 'generate_invoice'
  | 'needs_info'
  | 'error'
  | 'download_invoice'
  | 'end_conversation'
  | 'get_invoice_details'
  | 'get_project_code'
  | 'send_email'
  | 'prompt_download_option'
  | 'get_missing_details';

export interface ProcessWorkLogResponse {
  action: WorkLogAction;
  data: Record<string, any>;
  message: string;
}

export interface WorkLogEntry {
  description: string;
  hours: number;
  rate: number;
  date?: string;
  projectCode?: string;
  clientName?: string;
  total?: number;
  features?: string[];
}

/**
 * Makes a request to the local Ollama API
 */
async function queryOllama(prompt: string): Promise<string> {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3',
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error querying Ollama:', error);
    throw error;
  }
}

/**
 * Extracts invoice details using AI
 */
async function extractInvoiceDetails(input: string): Promise<{
  projectCode?: string;
  clientName?: string;
  period: string;
  items: Array<{ description: string; quantity: number; rate: number }>;
}> {
  try {
    // First check if input is just a project code (e.g., UP-MED-1074)
    const projectCodeMatch = input.trim().match(/^\s*([A-Z]{2,}-[A-Z]+-\d+|[A-Z]{2,}\d+)\s*$/i);

    if (projectCodeMatch) {
      const projectCode = projectCodeMatch[1].toUpperCase();

      // Try to get client details from database
      const projectDetails = await getProjectDetails(projectCode);
      const clientName = projectDetails?.client_name || 'Client';

      return {
        projectCode,
        clientName,
        period: new Date().toLocaleString('default', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace('/', '-'),
        items: [{
          description: 'Development work',
          quantity: 1,
          rate: 50
        }]
      };
    }

    const prompt = `Extract invoice details from the following text:
      
      Input: ${input}
      
      Extract:
      1. Project Code (look for patterns like UP-XXX-####, PROJ-####, or similar)
      2. Client name if mentioned (extract from project code if not explicitly mentioned)
      3. Time period (format as MM/YYYY or Month YYYY)
      4. Work items with description, quantity, and rate
      
      Return as JSON with this structure:
      {
        "projectCode": "string",
        "clientName": "string",
        "period": "string",
        "items": [{
          "description": "string",
          "quantity": number,
          "rate": number
        }]
      }`;

    const response = await queryOllama(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response as JSON');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Set default values if not provided
    if (!result.items || !Array.isArray(result.items) || result.items.length === 0) {
      result.items = [{
        description: 'Work',
        quantity: 1,
        rate: 50
      }];
    }

    if (!result.period) {
      const now = new Date();
      result.period = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    }

    return {
      projectCode: result.projectCode,
      clientName: result.clientName,
      period: result.period,
      items: result.items
    };
  } catch (error) {
    console.error('Error in extractInvoiceDetails:', error);
    // Fallback to regex-based extraction if AI fails
    const projectCodeMatch = input.match(/\b(?:UP-[A-Z]+-\d+|PRJ-\d+|[A-Z]{2,}\d+)\b/i);
    const hoursMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i);
    const rateMatch = input.match(/\$?(\d+(?:\.\d+)?)\/?h(?:r|our)?/i);

    const now = new Date();
    return {
      projectCode: projectCodeMatch ? projectCodeMatch[0].toUpperCase() : 'UNKNOWN-PROJECT',
      clientName: 'Client',
      period: `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`,
      items: [{
        description: 'Work',
        quantity: hoursMatch ? parseFloat(hoursMatch[1]) : 1,
        rate: rateMatch ? parseFloat(rateMatch[1]) : 50
      }]
    };
  }
}

/**
 * Calculates earnings based on hours worked and hourly rate
 */
export function calculateEarnings(hoursWorked: number, hourlyRate: number): number {
  return parseFloat((hoursWorked * hourlyRate).toFixed(2));
}

/**
 * Parses a work log entry from natural language text
 */
export async function parseWorkLogEntry(input: string): Promise<WorkLogEntry> {
  try {
    console.log('Using regex-based parsing for work log entry');
    const hoursMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i);
    const rateMatch = input.match(/\$?(\d+(?:\.\d+)?)\/?h(?:r|our)?/i);
    const projectMatch = input.match(/project\s+([A-Z0-9-]+)/i);
    const clientMatch = input.match(/for\s+([A-Za-z0-9\s.&]+?)(?:\s+for|\s+on|\s+at|\s+$)/i);
    const descMatch = input.match(/for\s+(.+?)(?:\s+at|\s+for|\s*$)/i);

    const hours = hoursMatch ? parseFloat(hoursMatch[1]) : 1;
    const rate = rateMatch ? parseFloat(rateMatch[1]) : 75;

    return {
      description: descMatch?.[1]?.trim() || 'Development work',
      hours,
      rate,
      projectCode: projectMatch?.[1],
      clientName: clientMatch?.[1]?.trim(),
      date: new Date().toISOString().split('T')[0],
      features: [],
      total: calculateEarnings(hours, rate)
    };
  } catch (error) {
    console.error('Error in parseWorkLogEntry:', error);
    throw new Error('Failed to parse work log entry');
  }
}

/**
 * Parses natural language input into structured invoice data
 */
// Enhanced to extract all invoice details from natural language
export async function parseWithLLM(input: string): Promise<Partial<ParsedInvoiceInput>> {
  console.log('parseWithLLM - Input:', input);

  try {
    // First try to extract all details including project code (supports various formats like XX-XXX-XXXX, PRJ123, ABC-123, etc.)
    const projectCodeMatch = input.match(/(?:project\s+)?([A-Za-z0-9][A-Za-z0-9-]{2,}(?:\s+[A-Za-z0-9-]+)*)/i);
    let projectCode = projectCodeMatch ? projectCodeMatch[1].trim().toUpperCase() : undefined;

    // Extract client name if mentioned
    const clientNameMatch = input.match(/for\s+client\s+([^\n,.]+)/i);
    const clientName = clientNameMatch ? clientNameMatch[1].trim() : undefined;

    // Extract period (month/year)
    const periodMatch = input.match(/(?:for|period|month of|in)\s+(?:the\s+)?(?:month of\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(?:\d{4}|'?\d{2}))?/i);
    let period = periodMatch ? periodMatch[0] : undefined;

    // Extract transaction charges
    const transactionMatch = input.match(/(?:transaction\s*(?:fee|charge|cost)s?\s*(?:of)?\s*\$?\s*(\d+(?:\.\d{1,2})?)|\$?\s*(\d+(?:\.\d{1,2})?)\s*(?:dollars?|USD)?\s*(?:transaction\s*(?:fee|charge|cost)))/i);
    const transactionCharges = transactionMatch ?
      parseFloat(transactionMatch[1] || transactionMatch[2] || '0') : 0;

    // Extract items using the existing extractInvoiceDetails
    const parsed = await extractInvoiceDetails(input);
    console.log('Extracted invoice details:', parsed);

    // If we have items but no project code from the initial match, use the one from parsed input
    if ((!projectCode || projectCode === 'GENERAL') && parsed.projectCode) {
      projectCode = parsed.projectCode;
    }

    // Prepare the result with all extracted information
    const result: Partial<ParsedInvoiceInput> = {
      projectCode: projectCode || parsed.projectCode,
      clientName: clientName || parsed.clientName,
      period: period || parsed.period,
      transactionCharges: transactionCharges || (parsed as any).transactionCharges || 0,
      items: (parsed.items || []).map(item => ({
        description: item.description || 'Work',
        quantity: item.quantity || 1,
        rate: item.rate || 0
      }))
    };

    // If we have a project code but no items, try to extract items from the input
    if (result.projectCode && (!result.items || result.items.length === 0)) {
      const itemMatch = input.match(/(\d+)\s*(?:hours?|hrs?)\s*(?:of\s+)?([^\d$]+?)\s*(?:at\s*\$?\s*(\d+(?:\.\d{1,2})?))?/gi);
      if (itemMatch) {
        result.items = itemMatch.map(item => {
          const [, quantity, desc, rate] = item.match(/(\d+)\s*(?:hours?|hrs?)\s*(?:of\s+)?([^\d$]+?)\s*(?:at\s*\$?\s*(\d+(?:\.\d{1,2})?))?/i) || [];
          return {
            description: (desc || 'Work').trim(),
            quantity: parseFloat(quantity) || 1,
            rate: parseFloat(rate) || 0
          };
        });
      }
    }

    return result;
  } catch (error) {
    console.error('Error in parseWithLLM:', error);
    return {
      items: [{
        description: 'Work',
        quantity: 1,
        rate: 0
      }]
    };
  }
}

/**
 * Processes work log input and determines the next action
 */
interface ProcessWorkLogInput {
  action?: string;
  data?: Record<string, any>;
  [key: string]: any;
}

export async function processWorkLog(input: string | ProcessWorkLogInput): Promise<ProcessWorkLogResponse> {
  console.log('Processing invoice request:', input);

  // Handle input based on its type
  const isStringInput = typeof input === 'string';
  const lowerInput = isStringInput ? input.trim().toLowerCase() : '';

  // Check if user wants to end the conversation
  if ((isStringInput && (lowerInput === 'no' || lowerInput === '3' || lowerInput === 'cancel' ||
    lowerInput.includes('no thanks') || lowerInput.includes('not now'))) ||
    (!isStringInput && input.action === 'end_conversation')) {
    return {
      action: 'end_conversation',
      data: {},
      message: 'Thank you for using our service. Have a great day!'
    };
  }

  // Check for download requests in natural language
  if (isStringInput && (lowerInput.includes('download') ||
    lowerInput.includes('get link') ||
    lowerInput.includes('don\'t send email') ||
    lowerInput.includes('don\'t want to send') ||
    lowerInput.includes('just download'))) {
    return {
      action: 'download_invoice',
      data: {},
      message: 'Preparing your invoice for download...'
    };
  }

  // Handle email collection prompt responses
  if (!isStringInput && input.action === 'collect_email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailInput = (typeof input.data?.email === 'string' ? input.data.email : '').trim().toLowerCase();

    if (emailRegex.test(emailInput)) {
      return {
        action: 'send_email',
        data: {
          ...(input.data || {}),
          email: emailInput
        },
        message: `Invoice has been sent to ${emailInput}! Is there anything else I can help you with?`
      };
    }

    // If not a valid email, check if they want to download instead
    if (emailInput.includes('download') || emailInput.includes('link') ||
      emailInput.includes('don\'t send') || emailInput.includes('no email')) {
      return {
        action: 'download_invoice',
        data: input.data || {},
        message: 'Preparing your invoice for download...'
      };
    }

    return {
      action: 'collect_email',
      data: input.data || {},
      message: 'That doesn\'t look like a valid email address. Please enter a valid email or type "download" to get a download link:'
    };
  }

  try {
    const currentDate = new Date().toISOString().split('T')[0];
    let parsedInput: Partial<ParsedInvoiceInput> = {};

    // Handle command inputs
    if (isStringInput) {
      // Only parse input if it's not a command
      if (!['1', '2', '3', 'download', 'email', 'cancel', 'no'].includes(lowerInput)) {
        parsedInput = await parseWithLLM(input);
      }
    } else if (input.action === 'prompt_download_option') {
      // Handle email input for invoice
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const emailInput = (typeof input.data?.email === 'string' ? input.data.email : '').trim().toLowerCase();

      if (emailRegex.test(emailInput)) {
        return {
          action: 'send_email',
          data: {
            ...(input.data || {}),
            email: emailInput
          },
          message: `Invoice has been sent to ${emailInput}! Is there anything else I can help you with?`
        };
      }

      return {
        action: 'collect_email',
        data: input.data || {},
        message: 'That doesn\'t look like a valid email address. Please enter a valid email or type "download" to get a download link:'
      };
    }

    // If we have some but not all required details, prompt for the rest
    if (parsedInput.projectCode && (!parsedInput.items || parsedInput.items.length === 0)) {
      return {
        action: 'get_invoice_details',
        data: {
          projectCode: parsedInput.projectCode,
          clientName: parsedInput.clientName || ''
        },
        message: 'I see you provided a project code. Could you please share the invoice details? For example: "5 hours of development at $75/hour, 3 hours of design at $60/hour for June 2023 with a $15 transaction fee"'
      };
    }

    if (parsedInput.items && parsedInput.items.length > 0) {
      const invoiceItems = (parsedInput.items || []).map((item: { description: string; quantity: number; rate: number }) => ({
        description: item.description || 'Work',
        quantity: item.quantity || 1,
        unit_price: item.rate || 0,
        amount: (item.quantity || 1) * (item.rate || 0)
      }));

      const subtotal = invoiceItems.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0);
      const transactionCharges = parsedInput.transactionCharges || 0;
      const total = subtotal + transactionCharges;

      const invoiceData = {
        projectCode: parsedInput.projectCode || 'GENERAL',
        clientName: parsedInput.clientName || 'Client',
        period: parsedInput.period || currentDate,
        items: invoiceItems,
        subtotal,
        transactionCharges,
        total,
        action: 'prompt_download_option' as const
      };

      return {
        action: 'generate_invoice',
        data: invoiceData,
        message: 'Invoice generated successfully! Would you like to:\n1. Receive it via email (provide email address)\n2. Download it directly\n3. Cancel'
      };
    }

    return {
      action: 'get_project_code',
      data: { input },
      message: 'Please provide the project code and invoice details. Example: "Project ABC123, 5 hours of development at $75/hour for June 2023"'
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing work log:', errorMessage);
    return {
      action: 'error',
      data: { input, error: errorMessage },
      message: 'An error occurred while processing your request. Please try again.'
    };
  }
}
