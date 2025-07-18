// models/project-details.model.ts
import { DataTypes } from "sequelize";
import sequelize from "../sequelize";

export const ProjectDetail = sequelize.define(
  "ProjectDetail",
  {
    project_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    project_code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    company_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    client_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    client_email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "projects_details",
    timestamps: false,
  }
);
