'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('projects_details', {
      project_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      project_code: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      company_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      client_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      client_email: {
        type: Sequelize.STRING(255),
        allowNull: false,
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('projects_details');
  }
};
