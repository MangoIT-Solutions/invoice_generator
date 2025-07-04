
import mysql from "mysql2/promise";
import { config } from "dotenv";
import bcrypt from "bcryptjs";

config();

// MySQL connection config (update with your credentials)
const dbConfig = {
  host: process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "root",
  database: process.env.MYSQL_DATABASE || "invoice_db",

  port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
};

export const pool = mysql.createPool(dbConfig);


// Interfaces
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

export interface InvoiceConfig {
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
  status: "draft" | "sent" | "paid";
  created_at: string;
  client_company_name?: string;
  type: string;
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

// Initialize database
export async function initializeDatabase() {
  const connection = await pool.getConnection();
  try {
    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Create invoice_config table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS invoice_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        starting_number INT NOT NULL,
        current_number INT NOT NULL
      )
    `);
    // Create invoices table
    await connection.query(`
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
      )
    `);
    // Create invoice_items table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_id INT NOT NULL,
        description TEXT NOT NULL,
        base_rate DECIMAL(10,2) NOT NULL,
        unit DECIMAL(10,2) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      )
    `);
    // Create projects_details table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS projects_details (
        project_id INT AUTO_INCREMENT PRIMARY KEY,
        project_code VARCHAR(255) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        address VARCHAR(255) NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        client_email VARCHAR(255) NOT NULL
      )
    `);
    // Create bank_details table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bank_details (
        id INT AUTO_INCREMENT PRIMARY KEY,
        account_number VARCHAR(255) NOT NULL,
        bank_name VARCHAR(255) NOT NULL,
        bank_address VARCHAR(255) NOT NULL,
        swift_code VARCHAR(255),
        ifsc_code VARCHAR(255),
        wire_charges VARCHAR(255) DEFAULT 0
      )
    `);
    // Create recurring_invoices table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS recurring_invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_id INT NOT NULL,
        next_run DATE NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      )
    `);

    // ✅ New CONFIG TABLE for refresh token etc.
    await connection.query(`
      CREATE TABLE IF NOT EXISTS config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(255) NOT NULL UNIQUE,
        \`value\` TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Insert default admin user
    const [adminRows] = await connection.query(
      "SELECT id FROM users WHERE role = ? LIMIT 1",
      ["admin"]
    );
    if ((adminRows as any[]).length === 0) {
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await connection.query(
        "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
        ["admin", "admin@company.com", hashedPassword, "admin"]
      );
    }

    // Insert default invoice config
    const [configRows] = await connection.query(
      "SELECT id FROM invoice_config LIMIT 1"
    );
    if ((configRows as any[]).length === 0) {
      await connection.query(
        "INSERT INTO invoice_config (starting_number, current_number) VALUES (?, ?)",
        [1000, 1000]
      );
    }

    console.log("MySQL Database initialized successfully");
  } catch (error) {
    console.error("Error initializing MySQL database:", error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function getAllProjects() {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query('SELECT * FROM projects_details');
    return rows as ProjectDetails[];
  } finally {
    connection.release();
  }
}

// Generic client utility

export const client = {
  execute: async (query: string | { sql: string; args: any[] }) => {
    const connection = await pool.getConnection();
    try { 
      if (typeof query === 'string') {
        const [rows] = await connection.query(query);
        return { rows };
      } else {
        const [result] = await connection.query(query.sql, query.args);
        // For INSERT, result.insertId is the new row's id
        const last_row_id = (result as any)?.insertId ?? null;
        return { rows: result, meta: { last_row_id } };
      }
    } finally {
      connection.release();
    }
  }
};
export async function saveRefreshToken(refreshToken: string) {
  const connection = await pool.getConnection();
  try {
    // Insert or update the refresh token in the config table
    await connection.query(
      `INSERT INTO config (\`key\`, \`value\`)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`,
      ["googleapiRefreshToken", refreshToken]
    );
  } finally {
    connection.release();
  }
}
export async function getRefreshToken(): Promise<string | null> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      `SELECT \`value\` FROM config WHERE \`key\` = ?`,
      ["googleapiRefreshToken"]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      return rows[0].value;
    }

    return null; // No token found
  } finally {
    connection.release();
  }
}

export async function getAutomateUser(): Promise<number> {
  const username = process.env.AUTOMATE_USER || "automate";
  const email = `${username}@system.local`;
  const password = await bcrypt.hash("automate123", 10); // Dummy password

  const connection = await pool.getConnection();
  try {
    // Check if user exists
    const [rows] = await connection.query(
      "SELECT id FROM users WHERE username = ? LIMIT 1",
      [username]
    );

    if ((rows as any[]).length > 0) {
      return (rows as any)[0].id;
    }

    // If not found, insert new automate user
    const [result] = await connection.query(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
      [username, email, password, "user"]
    );

    return (result as any).insertId;
  } finally {
    connection.release();
  }
}
  
