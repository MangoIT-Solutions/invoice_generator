// Sends parsed invoice data to API endpoint (`/api/invoices`) to create a new invoice record in DB.
export async function sendInvoiceToApi(invoicePayload: any) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(invoicePayload),
  });
  console.log("Sending invoice to API:", invoicePayload);
  const data = await res.json();
  return { status: res.status, data };
}
