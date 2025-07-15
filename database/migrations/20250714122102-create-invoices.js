'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('invoices', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      invoice_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users', 
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      client_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      client_company_name: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: '',
      },
      client_address: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      client_email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      invoice_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      period: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      term: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      project_code: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        allowNull: false,
      },
      payment_charges: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        allowNull: false,
      },
      total: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('draft', 'sent', 'paid'),
        defaultValue: 'draft',
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('invoices');
  },
};
