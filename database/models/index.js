import fs from "fs";
import path from "path";
import Sequelize from "sequelize";
import configAll from "../config.js";
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";
const config = configAll[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

export const initModels = async () => {
  const modelFiles = fs.readdirSync(__dirname)
    .filter((file) => (
      file.indexOf(".") !== 0 &&
      file !== basename &&
      file.slice(-3) === ".js" &&
      file.indexOf(".test.js") === -1
    ));

  await Promise.all(modelFiles.map(async (file) => {
    const modelModule = await import(path.join(__dirname, file));
    const modelClass = modelModule.default;
    if (modelClass && modelClass.prototype instanceof Sequelize.Model) {
      db[modelClass.name] = modelClass;
    }
  }));

  Object.keys(db).forEach((modelName) => {
    if (db[modelName].associate) {
      db[modelName].associate(db);
    }
  });

  db.sequelize = sequelize;
  db.Sequelize = Sequelize;
};

export { db };