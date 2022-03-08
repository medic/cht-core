const environment = require('../../environment');
const db = require('../../db');
/**
 * @typedef {Object} Database
 * @property {string} name
 * @property {PouchDB} db
 * @property {string} jsonFileName
 */

const MEDIC_DATABASE = {
  name: environment.db,
  db: db.medic,
  jsonFileName: 'medic.json',
};

/**
 * @type {Array<Database>}
 */
const DATABASES = [
  MEDIC_DATABASE,
  {
    name: `${environment.db}-sentinel`,
    db: db.sentinel,
    jsonFileName: 'sentinel.json',
  },
  {
    name: `${environment.db}-logs`,
    db: db.medicLogs,
    jsonFileName: 'logs.json',
  },
  {
    name: `${environment.db}-users-meta`,
    db: db.medicUsersMeta,
    jsonFileName: 'users-meta.json',
  },
];

module.exports = {
  MEDIC_DATABASE,
  DATABASES,
};
