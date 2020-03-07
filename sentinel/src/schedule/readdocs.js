/**
 * @module readdocs
 * 
 * Delete read docs from users db.
 TODO: fill this out
 */
const db = require('../db');
const logger = require('../lib/logger');
const metadata = require('../lib/metadata');
const tombstoneUtils = require('@medic/tombstone-utils');
const transitionsLib = require('../config').getTransitionsLib();

const deleteReadDocsFromUserDb = async (userDb, possibleReadDocIds) => {
  const metaDb = db.get(userDb);
  return metaDb
    .allDocs({ keys: possibleReadDocIds })
    .then(results => {
      const deletes = results.rows
        .filter(row => !row.error || row.error !== 'not_found')
        .map(row => {
          return {
            _id: row.id,
            _rev: row.value.rev,
            _deleted: true
          };
        });

      logger.info(`Cleanup of ${deletes.length} read docs from ${userDb}`);

      return metaDb.bulkDocs(deletes)
        .then(() => {
          // TODO: if there are any errors apart from 404 throw?
          // this should never happen and the only recourse would be to try again, which is lame
          // maybe instead write something generic for retries
        });
    })
    .then(() => {
      db.close(metaDb);
    })
    .catch(err => {
      db.close(metaDb);
      throw err;
    });
};

const deleteReadDocsFromUserDbs = async changes => {
  const possibleReadDocIds = Array(changes.length * 2);
  changes.forEach(change => {
    possibleReadDocIds.push(`read:report:${change.id}`);
    possibleReadDocIds.push(`read:message:${change.id}`);
  });

  let userDbs = await db.allDbs();
  userDbs = userDbs.filter(dbName => dbName.startsWith(`${db.medicDbName}-user-`));
  for (const userDb of userDbs) {
    await deleteReadDocsFromUserDb(userDb, possibleReadDocIds);
  }
};

const batchDeletes = seq => {
  // TODO: run explain to make sure this is indexed
  return db.medic.changes({
    since: seq,
    selector: {
      _deleted: true
    }
  }).then(changes => {
    if (changes.results.length) {
      return Promise
        .all([
          transitionsLib.infodoc.bulkDelete(changes.results),
          deleteReadDocsFromUserDbs(changes.results)
        ])
        .then(() => tombstoneUtils.processChanges(Promise, db.medic, changes.results, logger))
        .then(() => changes.last_seq);
    }

    return changes.last_seq;
  });
};

module.exports = {
  execute: cb => {
    metadata.getReadDocsProcessedSeq()
      .then(seq => {
        logger.info(`readdocs: scheduled clean up starting from ${seq}`);
        return batchDeletes(seq);
      })
      .then(seq => {
        logger.info(`readdocs: scheduled clean up finished at ${seq}`);        
        return metadata.updateReadDocsMetaData(seq);
      })
      .catch(err => {
        logger.error('Failed to exeute readdocs', err);
        // Not throwing this out so it's only contained into this scheduled task
        // (ie an error here doesn't stop other scheduled tasks from running)
        // If we change the scheduler to be better we can throw this err upwards
      })
      .then(() => cb());
  }
};
