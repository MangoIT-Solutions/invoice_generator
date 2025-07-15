
// models/invoice-item.model.ts
import {
    Model,
    DataTypes,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional
  } from 'sequelize';
  import sequelize from '../database/sequelize';
  import { Invoice } from './invoice.model';

  export class InvoiceItem extends Model<
    InferAttributes<InvoiceItem>,
    InferCreationAttributes<InvoiceItem>
  > {
    declare id: CreationOptional<number>;
    declare invoice_id: number;
    declare description: string;
    declare base_rate: number;
    declare unit: number;
    declare amount: number;
  }
  
  export const associateInvoiceItem = (models: { Invoice: typeof Invoice }) => {
    InvoiceItem.belongsTo(models.Invoice, {
      foreignKey: 'invoice_id',
      as: 'invoice',
    });
  };

  InvoiceItem.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      invoice_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      base_rate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      unit: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'invoice_items',
      timestamps: false,
    }
  );
  
  // InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });
