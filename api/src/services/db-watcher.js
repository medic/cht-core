const EventEmitter = require('events');
const db = require('../db');
const logger = require('../logger');

const OPTS = { live: true, since: 'now', return_docs: false };
const databases = [
  { dbObject: db.medic, emitter: new EventEmitter(), name: 'medic' },
  { dbObject: db.sentinel, emitter: new EventEmitter(), name: 'sentinel' },
  { dbObject: db.users, emitter: new EventEmitter(), name: 'users' },
];

const watchChanges = ({ dbObject, emitter, name }) => {
  dbObject
    .changes(OPTS)
    .on('change', (change) => {
      emitter.emit('change', change);
    })
    .on('error', (err) => {
      logger.error(`Error watching ${name} changes, restarting: %o`, err);
      setTimeout(() => watchChanges({ dbObject, emitter, name }));
    });
};

const subscribe = ({ emitter }, callback) => {
  emitter.on('change', callback);
};

const listen = () => databases.forEach(watchChanges);

module.exports = {
  listen,
  ...Object.fromEntries(databases.map(database => ([database.name, (callback) => subscribe(database, callback)])))
};
