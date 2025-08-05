"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    await queryInterface.bulkInsert("config", [
      {
        key: "starting_number",
        value: "1000",
        created_at: now,
        updated_at: now,
      },
      {
        key: "current_number",
        value: "1000",
        created_at: now,
        updated_at: now,
      },
      {
        key: "invoiceRequestEmailAllowed",
        value: "abc@example.com,xyz@gmail.com",
        created_at: now,
        updated_at: now,
      },
      {
        key: "upaidInvoiceReminderDays",
        value: "15",
        created_at: now,
        updated_at: now,
      },
      {
        key: "marginAmountForUnduePayment",
        value: "5.00",
        created_at: now,
        updated_at: now,
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
