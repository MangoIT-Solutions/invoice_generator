import { DataTypes } from "sequelize";
import sequelize from "../sequelize";

const Config = sequelize.define(
  "Config",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    keyIndex: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: "key",
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: true,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: true,
    },
  },
  {
    tableName: "config",
    timestamps: false,
  }
);

export default Config;
