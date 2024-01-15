//
// Asynchronously perform non-essential background cleanup based on following the changes feed.
//
// Changes should be repeatable as we only store progress after every batch
//
const db = require('../db');
const metadata = require('../lib/metadata');
const logger = require('../lib/logger');

const BATCH = 1000;

const getChanges = () => {
  return metadata
    .getBackgroundCleanupSeq()
    .then(seq => {
      return db.medic
        .changes({ since: seq, limit: BATCH })
        .then(changes => {
          const readableSeq = seq.split('-')[0];
          const readableLastSeq = changes.last_seq.split('-')[0];
          logger.info(`Background cleanup batch: ${readableSeq} -> ${readableLastSeq} (${changes.results.length})`);

          return {
            changes: changes.results,
            checkpointSeq: changes.last_seq,
            more: changes.results.length === BATCH
          };
        });
    });
};

const getDeleteStubs = ({ rows=[] }={}) => rows
  .filter(row => !row.error)
  .map(row => ({ _id: row.id, _rev: row.value.rev, _deleted: true }));

const deleteDocsFromDb = (dbObject, docIds) => {
  return dbObject
    .allDocs({ keys: docIds })
    .then(results => {
      const deleteStubs = getDeleteStubs(results);
      if (!deleteStubs.length) {
        return;
      }
      return dbObject.bulkDocs(deleteStubs);
    });
};

const deleteInfoDocs = changes => {
  const infoDocIds = changes.filter(c => c.deleted).map(c => c.id + '-info');

  if (!infoDocIds.length) {
    return Promise.resolve();
  }

  return Promise.all([
    // if the infodoc was not migrated to sentinel, we have to delete it from medic
    deleteDocsFromDb(db.medic, infoDocIds),
    deleteDocsFromDb(db.sentinel, infoDocIds),
  ]);
};

const deleteReadDocs = changes => {
  const deletedDocIds = changes.filter(c => c.deleted).map(c => c.id);

  if (!deletedDocIds.length) {
    return Promise.resolve();
  }

  // can't use array.flat() or array.flatMap() until node 11
  const possibleReadDocIds = deletedDocIds.reduce(
    (arr, id) => arr.concat(['report', 'message'].map(type => `read:${type}:${id}`)), []
  );

  return db.allDbs().then(dbs => {
    const userDbs = dbs.filter(dbName => dbName.startsWith(`${db.medicDbName}-user-`));

    // Intentionally not doing this in parallel because on larger systems we would fire off
    // thousands of requests at the same time. Would be great to use some kind of pressure based
    // work queue in the future
    let promise = Promise.resolve();
    for (const udb of userDbs) {
      const userDb = db.get(udb);

      promise = promise
        .then(() => deleteDocsFromDb(userDb, possibleReadDocIds))
        .then(() => {
          db.close(userDb);
        })
        .catch(err => {
          db.close(userDb);
          throw err;
        });
    }

    return promise;
  });
};

const batchLoop = () => {
  return getChanges()
    .then(({changes, checkpointSeq, more}) => {
      return Promise
        .all([
          deleteInfoDocs(changes),
          deleteReadDocs(changes),
        ])
        .then(() => metadata.setBackgroundCleanupSeq(checkpointSeq))
        .then(() => more && batchLoop());
    });
};

module.exports = {
  execute: batchLoop,
};
