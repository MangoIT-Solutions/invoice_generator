import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import sequelize from "../sequelize";
import { User } from "./user.model";
import { InvoiceItem } from "./invoice-item.model";

let invoiceAssociated = false;

export const associateInvoice = (models: {
  InvoiceItem: typeof InvoiceItem;
}) => {
  if (!invoiceAssociated) {
    Invoice.hasMany(models.InvoiceItem, {
      foreignKey: "invoice_id",
      as: "items",
    });
    invoiceAssociated = true;
  }
};

export class Invoice extends Model<
  InferAttributes<Invoice>,
  InferCreationAttributes<Invoice>
> {
  declare id: CreationOptional<number>;
  declare invoice_number: string;
  declare user_id: number;
  declare client_name: string;
  declare client_company_name?: string;
  declare client_address: string;
  declare client_email: string;
  declare invoice_date: string;
  declare period?: string;
  declare term?: string;
  declare project_code?: string;
  declare subtotal: number;
  declare payment_charges: number;
  declare total: number;
  declare lastUnpaidReminderDate?: Date;
  declare lastInvoiceSendDate?: Date | null;
  declare recurring_interval?: null | "once a month" | "twice a month";
  declare status: "draft" | "sent" | "fully_paid" | "partially_paid";
  senderEmail?: string;
  declare created_at: CreationOptional<Date>;
  static lastInvoiceSendDate: Date;
  declare items?: InvoiceItem[];
}

Invoice.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    invoice_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    client_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    client_company_name: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
    },
    client_address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    client_email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    invoice_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    period: DataTypes.STRING,
    term: DataTypes.STRING,
    project_code: DataTypes.STRING,
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },

    payment_charges: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    lastUnpaidReminderDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    recurring_interval: {
      type: DataTypes.ENUM("once a month", "twice a month"),
      allowNull: true,
      defaultValue: null,
    },
    status: {
      type: DataTypes.ENUM("draft", "sent", "fully_paid", "partially_paid"),
      defaultValue: "draft",
    },
    lastInvoiceSendDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    senderEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "invoices",
    timestamps: false,
  }
);

Invoice.belongsTo(User, { foreignKey: "user_id", as: "user" });
Invoice.hasMany(InvoiceItem, { foreignKey: "invoice_id", as: "items" });
InvoiceItem.belongsTo(Invoice, { foreignKey: "invoice_id" });
