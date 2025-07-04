
import mysql from "mysql2/promise";

// MySQL connection configuration
const config = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "mis_invoice_generator",
};

// Create connection pool
const pool = mysql.createPool(config);

// Export query function
export const sql = async (query: string, params: any[] = []): Promise<any> => {
  const connection = await pool.getConnection();
  try {
    const [results] = await connection.execute(query, params);
    return results;
  } finally {
    connection.release();
  }
};
