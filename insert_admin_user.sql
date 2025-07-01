-- Insert default admin user (password: admin123, hashed with bcryptjs)
INSERT INTO users (username, email, password, role) VALUES (
  'admin',
  'admin@company.com',
  '$2a$10$82cg0/aR5yx4kemi0bfTH.vebhUnt1zCYdZYMIjWwNPL0INFO7sRK',
  'admin'
);
