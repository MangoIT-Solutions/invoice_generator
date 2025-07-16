'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('company', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      contact: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      admin_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      admin_department: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      company_logo: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      hsn_sac: {
        type: Sequelize.STRING(50),
        allowNull: true,
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('company');
  }
};
