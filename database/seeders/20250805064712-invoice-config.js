"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    await queryInterface.bulkInsert("config", [
      {
        keyIndex: "starting_number",
        value: "1000",
        createdAt: now,
        updatedAt: now,
      },
      {
        keyIndex: "current_number",
        value: "1000",
        createdAt: now,
        updatedAt: now,
      },
      {
        keyIndex: "invoiceRequestEmailAllowed",
        value: "abc@example.com,xyz@gmail.com",
        createdAt: now,
        updatedAt: now,
      },
      {
        keyIndex: "upaidInvoiceReminderDays",
        value: "15",
        createdAt: now,
        updatedAt: now,
      },
      {
        keyIndex: "marginAmountForUnduePayment",
        value: "5.00",
        createdAt: now,
        updatedAt: now,
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("configs", {
      keyIndex: [
        "starting_number",
        "current_number",
        "invoiceRequestEmailAllowed",
        "upaidInvoiceReminderDays",
        "marginAmountForUnduePayment",
      ],
    });
  },
};
