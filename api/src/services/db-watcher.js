const EventEmitter = require('events');
const medicEmitter = new EventEmitter();
const sentinelEmitter = new EventEmitter();
const usersEmitter = new EventEmitter();

const db = require('../db');
const logger = require('../logger');

const OPTS = { live: true, since: 'now', return_docs: false };

const watchMedicChanges = () => {
  db.medic
    .changes(OPTS)
    .on('change', (change) => {
      medicEmitter.emit('change', change);
    })
    .on('error', (err) => {
      logger.error('Error watching medic changes, restarting: %o', err);
      process.exit(1);
    });
};

const watchSentinelChanges = () => {
  db.sentinel
    .changes(OPTS)
    .on('change', change => {
      sentinelEmitter.emit('change', change);
    })
    .on('error', (err) => {
      logger.error('Error watching sentinel changes, restarting: %o', err);
      process.exit(1);
    });
};

const watchUsersChanges = () => {
  db.users
    .changes(OPTS)
    .on('change', change => {
      usersEmitter.emit('change', change);
    })
    .on('error', (err) => {
      logger.error('Error watching _users changes, restarting: %o', err);
      process.exit(1);
    });
};

const subscribeToMedic = (callback) => {
  medicEmitter.on('change', callback);
};
const subscribeToSentinel = (callback) => {
  sentinelEmitter.on('change', callback);
};
const subscribeToUsers = (callback) => {
  usersEmitter.on('change', callback);
};

const listen = () => {
  watchMedicChanges();
  watchSentinelChanges();
  watchUsersChanges();
};

module.exports = {
  listen,
  medic: subscribeToMedic,
  sentinel: subscribeToSentinel,
  users: subscribeToUsers,
};
