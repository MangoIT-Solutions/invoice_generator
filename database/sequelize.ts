// lib/sequelize.ts
import { Sequelize } from 'sequelize';
import mysql2 from 'mysql2';


const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE as string,
  process.env.MYSQL_USER as string,
  process.env.MYSQL_PASSWORD as string,
  {
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    dialect: 'mysql',
    dialectModule: mysql2,
    logging: false // set to true to see SQL logs
  }
);

export default sequelize;
