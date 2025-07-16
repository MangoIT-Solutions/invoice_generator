// lib/sequelize-client.ts
import sequelize from './sequelize';

export const client = {
  execute: async (query: string | { sql: string; args: any[] }) => {
    try {
      if (typeof query === 'string') {
        const [rows] = await sequelize.query(query);
        return { rows };
      } else {
        const [rows, metadata] = await sequelize.query(query.sql, {
          replacements: query.args,
        });

        const last_row_id = (metadata as any)?.insertId ?? null;

        return {
          rows,
          meta: {
            last_row_id,
          },
        };
      }
    } catch (error) {
      console.error('Error executing raw SQL with Sequelize:', error);
      throw error;
    }
  },
};
