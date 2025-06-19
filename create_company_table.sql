-- MySQL table for company details
CREATE TABLE IF NOT EXISTS company (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  contact VARCHAR(255) NOT NULL,
  admin_name VARCHAR(255),
  admin_department VARCHAR(255),
  company_logo VARCHAR(255) -- store logo filename or URL
);
