-- Migration: Add client_company_name to invoices table
ALTER TABLE invoices ADD COLUMN client_company_name VARCHAR(255) AFTER client_name;
