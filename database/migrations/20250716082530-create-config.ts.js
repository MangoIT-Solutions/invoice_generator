"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("config", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      keyIndex: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        field: "key",
      },
      value: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        onUpdate: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Optional: Add unique index if needed
    await queryInterface.addIndex("config", ["keyIndex"], { unique: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("config");
  },
};
