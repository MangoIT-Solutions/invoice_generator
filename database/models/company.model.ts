import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import sequelize from "../sequelize";

export class Company extends Model<
  InferAttributes<Company>,
  InferCreationAttributes<Company>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare email: string;
  declare address: string;
  declare contact: string;
  declare admin_name: string;
  declare admin_department: string;
  declare company_logo: string;
  declare hsn_sac: string;
}

Company.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    address: DataTypes.STRING,
    contact: DataTypes.STRING,
    admin_name: DataTypes.STRING,
    admin_department: DataTypes.STRING,
    company_logo: DataTypes.STRING,
    hsn_sac: DataTypes.STRING,
  },
  {
    sequelize,
    tableName: "company",
    timestamps: false,
  }
);

export default Company;
