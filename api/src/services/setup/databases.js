const environment = require('@medic/environment');
const db = require('../../db');
/**
 * @typedef {Object} Database
 * @property {string} name
 * @property {PouchDB} db
 * @property {string} jsonFileName
 */

const MEDIC_DATABASE = {
  name: environment.db,
  db: db.medicAsAdmin,
  jsonFileName: 'medic.json',
};

/**
 * @type {Array<Database>}
 */
const DATABASES = [
  MEDIC_DATABASE,
  {
    name: `${environment.db}-sentinel`,
    db: db.sentinelAsAdmin,
    jsonFileName: 'sentinel.json',
  },
  {
    name: `${environment.db}-logs`,
    db: db.medicLogsAsAdmin,
    jsonFileName: 'logs.json',
  },
  {
    name: `${environment.db}-users-meta`,
    db: db.medicUsersMetaAsAdmin,
    jsonFileName: 'users-meta.json',
  },
  {
    name: `_users`,
    db: db.users,
    jsonFileName: 'users.json',
  },
];

const addSystemUserToDbs = () => Promise.all(DATABASES
  .filter(({ name }) => name !== '_users')
  .map(({ name }) => db.addUserAsMember(name, environment.username)));

module.exports = {
  MEDIC_DATABASE,
  DATABASES,
  init: async () => addSystemUserToDbs()
};
