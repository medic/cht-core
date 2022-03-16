const utils = require('./utils');

const PURGE_LOG_DOC_ID = '_local/purgelog';
const MAX_HISTORY_LENGTH = 10;
const BATCH_SIZE = 100;
const META_BATCHES = 10; // purge 10 * 100 documents on every startup
const TO_PURGE_LIST_KEY = 'cht-to-purge-list';
const PURGE_LIST_MAX_LENGTH = 1000;

const sortedUniqueRoles = roles => JSON.stringify([...new Set(roles)].sort());

const getPurgeLog = (localDb) => {
  return localDb.get(PURGE_LOG_DOC_ID).catch(err => {
    if (err.status === 404) {
      return {
        _id: PURGE_LOG_DOC_ID,
        history: [],
      };
    }
    throw err;
  });
};

const shouldPurgeMeta = (localDb) => {
  return getPurgeLog(localDb).then(purgeLog => !!purgeLog.synced_seq);
};

const appendToPurgeList = (ids) => {
  const toPurgeList = getToPurgeList();
  if (ids && ids.length) {
    toPurgeList.push(...ids);
    const unique = Array.from(new Set(toPurgeList));
    window.localStorage.setItem(TO_PURGE_LIST_KEY, JSON.stringify(unique));
  }
  return toPurgeList.length >= PURGE_LIST_MAX_LENGTH; // is list full?
}

const getToPurgeList = () => {
  const stored = window.localStorage.getItem(TO_PURGE_LIST_KEY);
  try {
    const parsed = JSON.parse(stored);
    return parsed || [];
  } catch(e) {
    console.error('Error parsing toPurgeList', e);
    return [];
  }
};

const clearToPurgeList = () => {
  window.localStorage.removeItem(TO_PURGE_LIST_KEY);
};

const purge = (localDb, userCtx, toPurge) => {
  const handlers = {};
  let totalPurged = 0;

  const emit = (name, event) => {
    console.debug(`Emitting '${name}' event with:`, event);
    (handlers[name] || []).forEach(callback => callback(event));
  };

  const batchedPurge = (ids) => {
    if (!ids || !ids.length) {
      return;
    }
    const batch = ids.slice(0, BATCH_SIZE);
    return purgeIds(localDb, batch)
      .then(nbr => {
        totalPurged += nbr;
        emit('progress', { purged: totalPurged });
      })
      .then(() => batchedPurge(ids.slice(BATCH_SIZE)));
  };

  emit('start');
  const p = Promise.resolve()
    .then(() => batchedPurge(toPurge))
    .then(() => writePurgeLog(localDb, totalPurged, userCtx))
    .then(() => clearToPurgeList())
    .then(() => emit('done', { totalPurged }));

  p.on = (type, callback) => {
    handlers[type] = handlers[type] || [];
    handlers[type].push(callback);
    return p;
  };

  return p;
};

const purgeMeta = (localDb) => {
  return getPurgeLog(localDb).then(purgeLog => batchedMetaPurge(localDb, purgeLog.purged_seq, purgeLog.synced_seq));
};

const writePurgeLog = (localDb, totalPurged, userCtx) => {
  return getPurgeLog(localDb).then(purgeLog => {
    const info = {
      date: new Date().getTime(),
      count: totalPurged,
      roles: sortedUniqueRoles(userCtx.roles)
    };
    Object.assign(purgeLog, info);
    purgeLog.history.unshift(info);
    if (purgeLog.history.length > MAX_HISTORY_LENGTH) {
      const diff = purgeLog.history.length - MAX_HISTORY_LENGTH;
      purgeLog.history.splice(diff * -1, diff);
    }

    return localDb.put(purgeLog);
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
  shouldPurgeMeta,
  getToPurgeList,
  appendToPurgeList,
  purge,
  purgeMeta,
  writeMetaPurgeLog,
  TO_PURGE_LIST_KEY,
};
