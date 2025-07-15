'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('bank_details', [
      {
        id: 1,
        account_number: '1234123412',
        bank_name: 'ABC Bank',
        bank_address: 'Ground Floor, Embassy Tower, Plot No.1-A  Indore,(M.P)- INDIA 452005',
        swift_code: 'XXSWIFCO',
        ifsc_code: 'IFSCXXX',
        wire_charges: 'On Client side'
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('bank_details', { id: 1 });
  }
};
