// models/bank-details.model.ts
import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize';
import sequelize from '../database/sequelize';

export class BankDetails extends Model<
  InferAttributes<BankDetails>,
  InferCreationAttributes<BankDetails>
> {
  declare id: CreationOptional<number>;
  declare account_number: string;
  declare bank_name: string;
  declare bank_address: string;
  declare swift_code: string;
  declare ifsc_code: string;
  declare wire_charges: string;
}

BankDetails.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    account_number: DataTypes.STRING,
    bank_name: DataTypes.STRING,
    bank_address: DataTypes.STRING,
    swift_code: DataTypes.STRING,
    ifsc_code: DataTypes.STRING,
    wire_charges: DataTypes.STRING,
  },
  {
    sequelize,
    tableName: 'bank_details',
    timestamps: false,
  }
);

export default BankDetails;
