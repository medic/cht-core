const utils = require('./utils');

const PURGE_LOG_DOC_ID = '_local/purgelog';
const MAX_HISTORY_LENGTH = 10;
const BATCH_SIZE = 100;
const META_BATCHES = 10; // purge 10 * 100 documents on every startup

const sortedUniqueRoles = roles => JSON.stringify([...new Set(roles)].sort());
const purgeFetch = (url) => {
  if (!opts) {
    alert('Purge is not enabled.\nCheck that purge\'s options are set and user have the correct roles assigned.');
    return Promise.reject('Purge\'s options are missing.');
  }

  return fetch(url, { headers: opts.remote_headers, credentials: 'same-origin' })
    .then(res => res.json())
    .then(res => {
      if (res && res.code && res.code !== 200) {
        throw new Error('Error fetching purge data: ' + JSON.stringify(res));
      }
      return res;
    });
};

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

let opts;
module.exports.setOptions = options => {
  opts = options;
};

module.exports.info = () => {
  return purgeFetch(`${utils.getBaseUrl()}/purging`).then(res => res && res.update_seq);
};

module.exports.checkpoint = (seq) => {
  if (!seq) {
    return Promise.resolve();
  }
  return purgeFetch(`${utils.getBaseUrl()}/purging/checkpoint?seq=${seq}`);
};

const daysToMs = (days) => 1000 * 60 * 60 * 24 * days;
module.exports.shouldPurge = (localDb, userCtx) => {
  return Promise
    .all([ localDb.get('settings'), getPurgeLog(localDb), module.exports.info() ])
    .then(([ { settings: { purge } }, purgelog, info ]) => {
      // purge not running on the server
      if (!purge) {
        console.debug('Not purging: Purge not configured.');
        return false;
      }

      if (!info) {
        console.debug('Not purging: Purge has not run on the server.');
        return false;
      }

      // if user roles have changed
      if (purgelog && purgelog.roles && purgelog.roles !== sortedUniqueRoles(userCtx.roles)) {
        console.debug('Purging: user roles changed since last purge');
        return true;
      }

      let dayInterval = parseInt(purge.run_every_days);

      if (Number.isNaN(dayInterval)) {
        dayInterval = 7;
      }

      const lastPurge = purgelog.date;
      const purgedRecently = lastPurge && (new Date().getTime() - daysToMs(dayInterval)) < lastPurge;
      if (purgedRecently) {
        console.debug('Not purging: purge ran recently');
        return false;
      }

      console.debug('Purging');
      return true;
    })
    .catch(err => {
      console.warn('Not purging:', err);
      return false;
    });
};

module.exports.shouldPurgeMeta = (localDb) => {
  return getPurgeLog(localDb).then(purgeLog => purgeLog.synced_seq);
};

module.exports.purge = (localDb, userCtx) => {
  const handlers = {};
  const baseUrl = utils.getBaseUrl();
  let totalPurged = 0;

  const emit = (name, event) => {
    console.debug(`Emitting '${name}' event with:`, event);
    (handlers[name] || []).forEach(callback => callback(event));
  };

  const batchedPurge = () => {
    return purgeFetch(`${baseUrl}/purging/changes`)
      .then(response => {
        const { purged_ids: ids, last_seq: lastSeq } = response;

        if (!ids || !ids.length) {
          return;
        }

        return purgeIds(localDb, ids)
          .then(nbr => {
            totalPurged += nbr;
            emit('progress', { purged: totalPurged });
            return module.exports.checkpoint(lastSeq);
          })
          .then(() => batchedPurge());
      });
  };

  emit('start');
  const p = Promise
    .resolve()
    .then(() => batchedPurge())
    .then(() => writePurgeLog(localDb, totalPurged, userCtx))
    .then(() => emit('done', { totalPurged }));

  p.on = (type, callback) => {
    handlers[type] = handlers[type] || [];
    handlers[type].push(callback);
    return p;
  };

  return p;
};

module.exports.purgeMeta = (localDb) => {
  return getPurgeLog(localDb).then(purgeLog => batchedMetaPurge(localDb, purgeLog.purged_seq, purgeLog.synced_seq));
};

module.exports.writePurgeMetaCheckpoint = (localDb, currentSeq) => {
  return writeMetaPurgeLog(localDb, { syncedSeq: currentSeq });
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

const batchedMetaPurge = (localDb, sinceSeq = 0, untilSeq, iterations = 0) => {
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
