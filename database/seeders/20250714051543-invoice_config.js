'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('invoice_config', [{
      id: 1,
      starting_number: 2005,
      current_number: 2056,
    }], {});
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('invoice_config', { id: 1 }, {});
  },
};
