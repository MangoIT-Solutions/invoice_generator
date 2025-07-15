# Invoice Generator

A modern, full-stack invoice generation and management system built with Next.js, TypeScript, and MySQL.

## Features

- Create, edit, and manage invoices
- Generate PDF invoices
- Customer and product management
- User authentication and authorization
- Responsive design for all devices

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v14 or later)
- npm (v7 or later) or yarn
- MySQL Server (v5.7 or later)
- XAMPP (for local development, optional but recommended)

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd invoice_generator
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
MYSQL_HOST=localhost
MYSQL_USER=your_mysql_username
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=invoice_generator
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### 4. Database Setup

#### Using XAMPP (Recommended for Development)

1. Start XAMPP Control Panel
2. Start Apache and MySQL services
3. Open phpMyAdmin (usually at http://localhost/phpmyadmin)
4. Create a new database named `invoice_generator`

#### Manual Database Creation

1. Connect to your MySQL server:
   ```bash
   mysql -u root -p
   ```
2. Create the database:
   ```sql
   CREATE DATABASE invoice_generator;
   ```

### 5. Database Migrations

Run the following command to execute database migrations:

```bash
npx sequelize-cli db:migrate
```

### 6. Seed the Database (Optional)

To populate the database with sample data:

```bash
npx sequelize-cli db:seed:all
```

### 7. Run the Application

Start the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm start` - Start the production server
- `npm run lint` - Run ESLint
- `npx sequelize-cli db:create` - Create the database
- `npx sequelize-cli db:migrate` - Run database migrations
- `npx sequelize-cli db:seed:all` - Seed the database

## Project Structure

```
.
├── app/                  # Next.js 13+ app directory
├── components/           # Reusable UI components
├── database/             # Database configuration and models
│   ├── migrations/       # Database migration files
│   ├── models/           # Sequelize models
│   └── seeders/          # Database seed files
├── lib/                  # Utility functions and helpers
├── pages/                # Next.js pages
├── public/               # Static files
└── services/             # Business logic and API services
```

## Environment Variables

- `MYSQL_HOST` - MySQL server host
- `MYSQL_USER` - MySQL username
- `MYSQL_PASSWORD` - MySQL password
- `MYSQL_DATABASE` - Database name
- `NEXTAUTH_SECRET` - Secret for NextAuth.js
- `NEXTAUTH_URL` - Base URL of your application

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
