const PURGE_LOG_DOC_ID = '_local/purgelog';
const MAX_HISTORY_LENGTH = 20;
const BATCH_SIZE = 100;
const META_BATCHES = 10; // purge 10 * 100 documents on every startup

const sortedUniqueRoles = roles => JSON.stringify([...new Set(roles)].sort());

const getPurgeLog = (localDb) => {
  return localDb.get(PURGE_LOG_DOC_ID).catch(err => {
    if (err.status === 404) {
      return { _id: PURGE_LOG_DOC_ID };
    }
    throw err;
  });
};

const shouldPurgeMeta = (localDb) => {
  return getPurgeLog(localDb).then(purgeLog => !!purgeLog.synced_seq);
};

const appendToPurgeList = (localDb, ids) => {
  if (!ids || !ids.length) {
    return Promise.resolve();
  }
  return getPurgeLog(localDb)
    .then(log => {
      if (log.to_purge && log.to_purge.length) {
        ids = Array.from(new Set(log.to_purge.concat(ids)));
      }
      log.to_purge = ids;
      return localDb.put(log).then(() => log);
    });
};

const purgeMeta = (localDb) => {

  const eventListeners = {};

  const emit = (name, event) => {
    console.debug(`Emitting '${name}' event with:`, event);
    (eventListeners[name] || []).forEach(callback => callback(event));
  };

  const p = Promise.resolve()
    .then(() => shouldPurgeMeta(localDb))
    .then(shouldPurge => {
      emit('should-purge', shouldPurge);
      if (shouldPurge) {
        emit('start');
        return getPurgeLog(localDb)
          .then(purgeLog => batchedMetaPurge(localDb, purgeLog.purged_seq, purgeLog.synced_seq))
          .then(() => emit('done'));
      }
    });

  p.on = (type, callback) => {
    eventListeners[type] = eventListeners[type] || [];
    eventListeners[type].push(callback);
    return p;
  };

  return p;
};

const writePurgeLog = (localDb, userCtx, totalPurged, docIds) => {
  return getPurgeLog(localDb).then(log => {
    const info = {
      date: new Date().getTime(),
      count: totalPurged,
      roles: sortedUniqueRoles(userCtx.roles)
    };
    Object.assign(log, info);
    if (!log.history) {
      log.history = [];
    }
    log.history.unshift(info);
    if (log.history.length > MAX_HISTORY_LENGTH) {
      log.history = log.history.slice(0, MAX_HISTORY_LENGTH);
    }
    log.to_purge = (log.to_purge || []).filter(id => {
      return !docIds.includes(id);
    });
    return localDb.put(log);
  });
};

const writeMetaPurgeLog = (localDb, { syncedSeq, purgedSeq }) => {
  return getPurgeLog(localDb).then(purgeLog => {
    if (purgedSeq) {
      purgeLog.purged_seq = purgedSeq;
    }

    if (syncedSeq) {
      purgeLog.synced_seq = syncedSeq;
    }

    return localDb.put(purgeLog);
  });
};

const batchedMetaPurge = (localDb, sinceSeq = 0, untilSeq = '', iterations = 0) => {
  if (iterations >= META_BATCHES) {
    return; // stop after 10 iterations
  }

  let nextSeq;

  const isFeedbackOrTelemetryDoc = change => change.id.startsWith('telemetry-') || change.id.startsWith('feedback-');
  return localDb
    .changes({ since: sinceSeq, limit: BATCH_SIZE })
    .then(changes => {
      nextSeq = changes.results.length && //stop when we've no more changes to process
                changes.last_seq < untilSeq && // stop when reaching last uploaded seq
                changes.last_seq;

      const changesToPurge = changes.results.filter(change => (
        !change.deleted && // ignore deletes
        change.seq <= untilSeq && // skip docs that we have not yet synced
        isFeedbackOrTelemetryDoc(change) // skip docs that are not feedback or telemetry docs
      ));

      if (!changesToPurge.length) {
        return;
      }

      const ids = changesToPurge.map(change => change.id);
      return purgeIds(localDb, ids);
    })
    .then(() => writeMetaPurgeLog(localDb, { purgedSeq: nextSeq || untilSeq }))
    .then(() => nextSeq && batchedMetaPurge(localDb, nextSeq, untilSeq, iterations + 1));
};

const purgeIds = (db, ids) => {
  let nbrPurged;
  return db
    .allDocs({ keys: ids })
    .then(result => {
      const purgedDocs = [];
      result.rows.forEach(row => {
        if (row.id && row.value && !row.value.deleted) {
          purgedDocs.push({ _id: row.id, _rev: row.value.rev, _deleted: true, purged: true });
        }
      });
      nbrPurged = purgedDocs.length;
      return db.bulkDocs(purgedDocs);
    })
    .then(results => {
      let errors = '';
      results.forEach(result => {
        if (!result.ok) {
          errors += result.id + ' with ' + result.message + '; ';
        }
      });
      if (errors) {
        throw new Error(`Not all documents purged successfully: ${errors}`);
      }

      return nbrPurged;
    });
};

module.exports = {
  purgeMeta,
  appendToPurgeList,
  writeMetaPurgeLog,
};
