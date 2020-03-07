/**
 * @module readdocs
 */
const db = require('./db');
const logger = require('./lib/logger');
const metadata = require('./lib/metadata');
const tombstoneUtils = require('@medic/tombstone-utils');
const transitionsLib = require('./config').getTransitionsLib();

const EXECUTION_INTERVAL = 60 * 1000; // 1 minute

let init;

const getProcessedSeq = () => {
  return metadata
    .getReadDocsProcessedSeq()
    .catch(err => {
      logger.error('readdocs: error fetching processed seq: %o', err);
      return;
    });
};

const updateMetadata = seq => metadata.updateReadDocsMetaData(seq);

const deleteReadDocsFromUsersDb = changes => {
  const possibleReadDocIds = Array.prototype.concat.apply([], changes.map(change => [`read:report:${change.id}`, `read:message:${change.id}`]));
      
  return db.allDbs().then(dbs => {
    const userDbs = dbs.filter(dbName => dbName.indexOf(`${db.medicDbName}-user-`) === 0);
    return userDbs.reduce((p, userDb) => {
      return p.then(() => {
        const metaDb = db.get(userDb);
        return metaDb
          .allDocs({ keys: possibleReadDocIds, include_docs: true })
          .then(results => {
            const docs = results.rows.filter(row => Object.keys(row).includes('doc'))
                                     .map(row => {logger.info(`  readdocs: ${JSON.stringify(row, null, 2)}`);
                                       row.doc._deleted = true;
                                       return row.doc;
                                     });

            return metaDb.bulkDocs(docs).catch(err => {
              // ignore 404s or 409s - the docs were probably deleted client side already
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

const batchDeletes = seq => {
  logger.info(`readdocs: fetching deleted changes feed, starting from ${seq}`);
  db.medic.changes({
    since: seq,
    selector: {
      _deleted: true
    }
  }).then(changes => {
    if (changes.results.length) {
      return Promise
        .all([
          transitionsLib.infodoc.bulkDelete(changes.results),
          deleteReadDocsFromUsersDb(changes.results)
        ])
        .then(() => tombstoneUtils.processChanges(Promise, db.medic, changes.results, logger))
        .then(() => updateMetadata(changes.last_seq))
        .catch(err => {
          logger.error('Error cleaning up deleted docs: %o', err);
          init = null;
        });
    }

    return updateMetadata(changes.last_seq);
  }).catch(err => {
    logger.error('readdocs: error from changes feed: %o', err);
    init = null;
  });
};

const runDeletes = () => {
  if (!init) {
    init = getProcessedSeq().then(seq => batchDeletes(seq)).then(() => { init = null; });
  }
};

const deleteReadDocs = () => {
  setInterval(runDeletes, EXECUTION_INTERVAL);
};

module.exports = {

  /**
   * Delete read docs from users db.
   */
  deleteReadDocs: deleteReadDocs,
};