import { processWorkLog } from './lib/llmUtils';

async function testInvoiceCreation() {
  try {
    // Test with a work log entry
    const workLogInput = "I worked on UP-MED-1074 project for 2 hours at $30/hour on 2025-06-25. Development of chat feature.";
    console.log('\n=== Logging Work ===');
    const workLogResult = await processWorkLog(workLogInput);
    console.log(workLogResult.message);
    
    // Now create an invoice
    console.log('\n=== Creating Invoice ===');
    const invoiceInput = "Create an invoice for UP-MED-1074 project for John Holding";
    const invoiceResult = await processWorkLog(invoiceInput);
    console.log(invoiceResult.message);
    
    if (invoiceResult.action === 'create_invoice') {
      console.log('Invoice details:', invoiceResult.data);
      // Here you would typically call your invoice generation function
      // e.g., await generateInvoice(invoiceResult.data);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testInvoiceCreation();
