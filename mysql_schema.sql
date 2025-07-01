-- MySQL schema for Invoice Generator

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  starting_number INT NOT NULL,
  current_number INT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(255) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_address VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  invoice_date DATE NOT NULL,
  period VARCHAR(255),
  term VARCHAR(255),
  project_code VARCHAR(255),
  subtotal DECIMAL(10,2) DEFAULT 0,
  payment_charges DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  status ENUM('draft', 'sent', 'paid') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  description TEXT NOT NULL,
  base_rate DECIMAL(10,2) NOT NULL,
  unit DECIMAL(10,2) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projects_details (
  project_id INT AUTO_INCREMENT PRIMARY KEY,
  project_code VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  address VARCHAR(255) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NOT NULL
);
