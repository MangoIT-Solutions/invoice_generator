"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    await queryInterface.bulkInsert("config", [
      {
        key: "starting_number",
        value: "1000",
        createdAt: now,
        updatedAt: now,
      },
      {
        key: "current_number",
        value: "1000",
        createdAt: now,
        updatedAt: now,
      },
      {
        key: "invoiceRequestEmailAllowed",
        value: "abc@example.com,xyz@gmail.com",
        createdAt: now,
        updatedAt: now,
      },
      {
        key: "upaidInvoiceReminderDays",
        value: "15",
        createdAt: now,
        updatedAt: now,
      },
      {
        key: "marginAmountForUnduePayment",
        value: "5.00",
        createdAt: now,
        updatedAt: now,
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("config", {
      key: [
        "starting_number",
        "current_number",
        "invoiceRequestEmailAllowed",
        "upaidInvoiceReminderDays",
        "marginAmountForUnduePayment",
      ],
    });
  },
};
