'use strict';
export default {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert('projects_details', [
      {
        project_id: 1,
        project_code: 'UP-AND-1073',
        company_name: 'MTO Solutions kft',
        address: 'Hungry-Budapest 1036 Arpad fejedelem utja 53. 3em.2.',
        client_name: 'Mr. Andras Gaal',
        client_email: 'ashish@mangoitsolutions.com'
      },
      {
        project_id: 2,
        project_code: 'UP-MED-1074',
        company_name: 'John Holding',
        address: `John Holding Ltd.
Level 12, Pinnacle Business Tower
48 Grantham Avenue
London
United State`,
        client_name: 'John Streenan',
        client_email: 'john@youremail.com'
      },
    ]);
  },

  async down(queryInterface) {
    const { Op } = require('sequelize');
    await queryInterface.bulkDelete('projects_details', {
      project_id: { [Op.in]: [1, 2] }
    });
  }
};
