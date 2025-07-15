// src/models/index.ts

export interface User {
    id: number;
    username: string;
    email: string;
    password: string;
    role: 'admin' | 'user';
    created_at: string;
  }
  
  export interface Company {
    company_logo: string;
    id: number;
    name: string;
    logo?: string;
    address: string;
    email: string;
    contact: string;
    admin_name: string;
    admin_department: string;
    hsn_sac?: string;
  }
  
  export interface InvoiceConfigAttributes {
    id: number;
    starting_number: number;
    current_number: number;
  }
  
  export interface Invoice {
    additional_charge: number;
    id: number;
    invoice_number: string;
    user_id: number;
    client_name: string;
    client_address: string;
    client_email: string;
    invoice_date: string;
    period: string;
    term: string;
    project_code: string;
    subtotal: number;
    payment_charges: number;
    total: number;
    status: 'draft' | 'sent' | 'paid';
    created_at: string;
    client_company_name?: string;
  }
  
  export interface InvoiceItem {
    id: number;
    invoice_id: number;
    description: string;
    base_rate: number;
    unit: number;
    amount: number;
  }
  
  export interface ProjectDetails {
    project_id: number;
    project_code: string;
    company_name: string;
    address: string;
    client_name: string;
    client_email: string;
  }
  
  export interface BankDetails {
    id: number;
    account_number: string;
    bank_name: string;
    bank_address: string;
    swift_code: string;
    ifsc_code: string;
    wire_charges: number;
  }
  
  export interface RecurringInvoice {
    id: number;
    invoice_id: number;
    next_run: string; // ISO date string YYYY-MM-DD
  }
  