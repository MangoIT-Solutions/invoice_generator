'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bank_details', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      account_number: {
        type: Sequelize.STRING(255),
        allowNull: true,  // Nullable as per your table
      },
      bank_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      bank_address: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      swift_code: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      ifsc_code: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      wire_charges: {
        type: Sequelize.STRING(255),
        allowNull: true,
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('bank_details');
  }
};
