import { DataTypes } from "sequelize";
import sequelize from "../sequelize";
import { Invoice } from "./invoice.model";

const InvoicePayment = sequelize.define("InvoicePayment", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  invoice_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  transaction_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
});

Invoice.hasMany(InvoicePayment, { foreignKey: "invoice_id" });
InvoicePayment.belongsTo(Invoice, { foreignKey: "invoice_id" });


export default InvoicePayment;
