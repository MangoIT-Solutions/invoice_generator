"use strict";

export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("invoices", "senderEmail", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("invoices", "senderEmail");
  },
};
