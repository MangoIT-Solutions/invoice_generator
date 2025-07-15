'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('company', [{
      id: 1,
      name: 'Mango IT Solutions',
      address: '15/3, Old Palasia, Behind Sarda House, Indore 452 001 India',
      email: 'Matt@yourdomain.com',
      contact: '+91-731-4044117/4046693',
      admin_name: 'MangoIT Accounts',
      admin_department: 'Billing Department, Mango It Solutions',
      company_logo: 'uploads/1752211356560-1749807171811_logo_3.png',
      hsn_sac: '998314',
    }], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('company', { id: 1 }, {});
  }
};
