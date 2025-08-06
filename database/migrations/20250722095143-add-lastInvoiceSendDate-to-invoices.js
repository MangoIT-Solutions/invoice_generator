"use strict";

/** @type {import('sequelize-cli').Migration} */
export default{
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("invoices", "lastInvoiceSendDate", {
      type: Sequelize.DATE,
      allowNull: true, // Set to false if you want it to be required
      defaultValue: null, // Set to null if you want it to be optional
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("invoices", "lastInvoiceSendDate");
  },
};
