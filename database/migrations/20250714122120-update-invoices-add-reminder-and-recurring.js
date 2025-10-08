"use strict";

export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("invoices", "lastUnpaidReminderDate", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("invoices", "recurring_interval", {
      type: Sequelize.ENUM("once a month", "twice a month"),
      allowNull: true,
    });

    // First remove the existing ENUM and re-add with new values
    await queryInterface.changeColumn("invoices", "status", {
      type: Sequelize.ENUM("draft", "sent", "fully_paid", "partially_paid"),
      allowNull: false,
      defaultValue: "draft",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("invoices", "lastUnpaidReminderDate");
    await queryInterface.removeColumn("invoices", "recurring_interval");

    await queryInterface.changeColumn("invoices", "status", {
      type: Sequelize.ENUM("draft", "sent", "paid"),
      allowNull: false,
      defaultValue: "draft",
    });

    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_invoices_recurring_interval"
    );
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_invoices_status"
    );
  },
};
