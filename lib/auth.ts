import { pool } from './database';
import bcrypt from 'bcryptjs';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
}

export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if ((rows as any[]).length === 0) {
      return null;
    }
    const user = (rows as any[])[0];
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return null;
    }
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export async function createUser(username: string, email: string, password: string, role: 'admin' | 'user' = 'user') {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)', [username, email, hashedPassword, role]);
    return (result as any).insertId;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function getAllUsers() {
  try {
    const [rows] = await pool.query('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC');
    return rows;
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

export async function deleteUser(id: number) {
  try {
    await pool.query('DELETE FROM users WHERE id = ? AND role != "admin"', [id]);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}