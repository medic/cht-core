const environment = require('@medic/environment');
const db = require('../../db');
/**
 * @typedef {Object} Database
 * @property {string} name
 * @property {PouchDB} db
 * @property {string} jsonFileName
 * @property {string[]?} ddocs
 */

const MEDIC_DATABASE = {
  name: environment.db,
  db: db.medic,
  jsonFileName: 'medic.json',
  ddocs: [
    'medic',
    'medic-admin',
    'medic-client',
    'medic-conflicts',
    'medic-scripts',
    'medic-sms',
  ],
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
    ddocs: ['sentinel'],
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
    ddocs: ['users-meta'],
  },
  {
    name: `_users`,
    db: db.users,
    jsonFileName: 'users.json',
    ddocs: ['users'],
  },
];

module.exports = {
  MEDIC_DATABASE,
  DATABASES,
};
