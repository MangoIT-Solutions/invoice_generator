// models/invoice-config.model.ts
import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import sequelize from "../sequelize";

export class InvoiceConfig extends Model<
  InferAttributes<InvoiceConfig>,
  InferCreationAttributes<InvoiceConfig>
> {
  declare id: CreationOptional<number>;
  declare starting_number: number;
  declare current_number: number;
}

InvoiceConfig.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    starting_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    current_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "invoice_config",
    timestamps: false,
  }
);
