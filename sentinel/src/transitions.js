/**
 * @module transitions
 */
const async = require('async');
const feed = require('./lib/feed');
const db = require('./db');
const logger = require('./lib/logger');
const metadata = require('./lib/metadata');
const tombstoneUtils = require('@medic/tombstone-utils');
const transitionsLib = require('./config').getTransitionsLib();
const PROGRESS_REPORT_INTERVAL = 500; // items

let processed = 0;

const loadTransitions = () => {
  try {
    transitionsLib.loadTransitions();
    feed.listen(change => changeQueue.push(change));
  } catch (e) {
    logger.error('Transitions are disabled until the above configuration errors are fixed.');
    feed.cancel();
  }
};

const changeQueue = async.queue((change, callback) => {
  if (!change) {
    return callback();
  }
  logger.debug(`change event on doc ${change.id} seq ${change.seq}`);
  if (processed > 0 && processed % PROGRESS_REPORT_INTERVAL === 0) {
    logger.info(
      `transitions: ${processed} items processed (since sentinel started)`
    );
  }
  if (change.deleted) {
    return callback();
  }

  transitionsLib.processChange(change, err => {
    if (err) {
      return callback(err);
    }

    updateMetadata(change, callback);
  });
});

const updateMetadata = (change, callback) => {
  processed++;
  metadata
    .update(change.seq)
    .then(() => callback())
    .catch(callback);
};

const deleteReadDocs = change => {
  // we don't know if the deleted doc was a report or a message so
  // attempt to delete both
  const possibleReadDocIds = ['report', 'message'].map(
    type => `read:${type}:${change.id}`
  );

  return db.allDbs().then(dbs => {
    const userDbs = dbs.filter(dbName => dbName.indexOf(`${db.medicDbName}-user-`) === 0);
    return userDbs.reduce((p, userDb) => {
      return p.then(() => {
        const metaDb = db.get(userDb);
        return metaDb
          .allDocs({ keys: possibleReadDocIds })
          .then(results => {
            const row = results.rows.find(row => !row.error);
            if (!row) {
              return;
            }

            return metaDb.remove(row.id, row.value.rev).catch(err => {
              // ignore 404s or 409s - the doc was probably deleted client side already
              if (err && err.status !== 404 && err.status !== 409) {
                throw err;
              }
            });
          })
          .then(() => {
            db.close(metaDb);
          })
          .catch(err => {
            db.close(metaDb);
            throw err;
          });
      });
    }, Promise.resolve());

  });
};

module.exports = {

  /**
   * Loads the transitions and starts watching for db changes.
   */
  loadTransitions: loadTransitions,

  // exposed for testing
  _changeQueue: changeQueue,
  _deleteReadDocs: deleteReadDocs,
  _transitionsLib: transitionsLib,
};
