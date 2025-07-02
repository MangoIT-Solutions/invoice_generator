// Simple work log processor for testing
// In a production environment, this would use an LLM like Google's Gemini

interface WorkLogEntry {
  projectCode: string;
  hours: number;
  rate: number;
  description: string;
  date: string;
  total?: number;
}

type WorkLogAction = 'log_work' | 'collect_email' | 'generate_invoice' | 'complete' | 'error';

export interface ProcessWorkLogResponse {
  action: WorkLogAction;
  data: any;
  message: string;
}

function calculateEarnings(hours: number, rate: number): number {
  return parseFloat((hours * rate).toFixed(2));
}

export async function processWorkLog(input: string): Promise<ProcessWorkLogResponse> {
  console.log('Processing work log input:', input);
  
  try {
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Simple response for testing
    const testResponse = {
      action: 'log_work',
      entries: [
        {
          projectCode: 'GENERAL',
          hours: 5,
          rate: 56,
          description: 'Development work',
          date: currentDate,
          total: 280 // 5 * 56
        }
      ],
      message: 'Logged 5 hours of development work at $56/hour'
    };
    
    // For now, use the test response
    const resultData = testResponse;
    
    // Process the entries and calculate totals
    if (resultData.entries && resultData.entries.length > 0) {
      const processedEntries = resultData.entries.map(entry => ({
        ...entry,
        total: calculateEarnings(entry.hours, entry.rate)
      }));
      
      // Ask for email to send invoice
      return {
        action: 'collect_email',
        data: processedEntries,
        message: '📧 Please provide an email address to send the invoice to:'
      };
    }
    
    // If no entries were found
    return {
      action: 'error',
      data: { input },
      message: 'I had trouble understanding that. Could you try rephrasing? Example: "5 hours of development at $75/hour"'
    };
    
  } catch (error) {
    console.error('Error processing work log:', error);
    return {
      action: 'error',
      data: { input, error: String(error) },
      message: 'An error occurred while processing your request. Please try again.'
    };
  }
}
