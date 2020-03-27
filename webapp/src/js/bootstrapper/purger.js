const utils = require('./utils');

const PURGE_LOG_DOC_ID = '_local/purgelog';
const MAX_HISTORY_LENGTH = 10;

const sortedUniqueRoles = roles => JSON.stringify([...new Set(roles)].sort());
const purgeFetch = (url) => {
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

module.exports.purgeMeta = (localDb, untilSeq) => {
  const s = new Date().getTime();
  return getPurgeLog(localDb)
    .then(purgeLog => batchedMetaPurge(localDb, purgeLog.last_purge_seq, untilSeq))
    .then(() => writeMetaPurgeLog(localDb, untilSeq))
    .then(() => console.log('purging took', (new Date().getTime() - s) / 1000), 'seconds');
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

const writeMetaPurgeLog = (localDb, seq) => {
  return getPurgeLog(localDb).then(purgeLog => {
    purgeLog.last_purge_seq = seq;
    return localDb.put(purgeLog);
  });
};

const batchedMetaPurge = (localDb, sinceSeq = 0, untilSeq) => {
  const isFeedbackOrTelemetryDoc = change => change.id.startsWith('telemetry-') || change.id.startsWith('feedback-');
  console.log('purging', sinceSeq, untilSeq);
  return localDb
    .changes({ since: sinceSeq, limit: 100 })
    .then(changes => {
      const ids = changes.results
        .filter(change => change.seq < untilSeq && isFeedbackOrTelemetryDoc(change))
        .map(change => change.id);

      const shouldContinue = changes.results.length &&
                             changes.last_seq <= untilSeq &&
                             changes.last_seq;

      if (!ids || !ids.length) {
        return shouldContinue;
      }

      return purgeIds(localDb, ids)
        .then(() => writeMetaPurgeLog(localDb, shouldContinue))
        .then(() => shouldContinue);
    })
    .then(sinceSeq => sinceSeq && batchedMetaPurge(localDb, sinceSeq, untilSeq));
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
