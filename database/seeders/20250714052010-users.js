'use strict';

export default{
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('users', [
      {
        id: 1,
        username: 'admin',
        email: 'admin@company.com',
        password: '$2a$10$KiSw.VRUZ7skcAFuk4ZJAe4MSwslTCeVM.Qc2EsQiqbNO6cecDAGS',
        role: 'admin',
        created_at: new Date('2025-06-12T12:37:07'),
      },
    ], {});
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('users', {
      email: 'admin@company.com',
    }, {});
  },
};
