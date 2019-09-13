const utils = require('./utils');
const purgingUtils = require('@medic/purging-utils');

const PURGE_LOG_DOC_ID = '_local/purgelog';
const MAX_HISTORY_LENGTH = 10;

module.exports.LAST_REPLICATED_SEQ_KEY = 'medic-last-replicated-seq';

const purgeFetch = (url) => {
  return fetch(url, { headers: opts.remote_headers }).then(res => res.json());
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
  return purgeFetch(`${utils.getBaseUrl()}/purging`).then(res => res.update_seq);
};

module.exports.checkpoint = (seq = 'now') => {
  return purgeFetch(`${utils.getBaseUrl()}/purging/checkpoint?seq=${seq}`);
};

const daysToMs = (days) => 1000 * 60 * 60 * 24 * days;
module.exports.shouldPurge = (localDb, userCtx) => {
  return Promise
    .all([ localDb.get('settings'), getPurgeLog(localDb), localDb.info() ])
    .then(([ { settings: purge }, purgelog, info ]) => {
      // purge not running on the server
      if (!purge) {
        return false;
      }

      // if user roles have changed
      if (purgelog &&
          purgelog.roles &&
          purgelog.roles !== JSON.stringify(purgingUtils.sortedUniqueRoles(userCtx.roles))) {
        return true;
      }

      let dayInterval = parseInt(purge.run_every_days);
      if (Number.isNaN(dayInterval)) {
        dayInterval = 7;
      }

      const lastPurge = purgelog.date;
      const purgedRecently = lastPurge && (new Date().getTime() - daysToMs(dayInterval)) < lastPurge;
      if (purgedRecently) {
        return false;
      }

      const highestSyncSeq = parseInt(window.localStorage.getItem(module.exports.LAST_REPLICATED_SEQ_KEY));
      if (!highestSyncSeq || Number.isNaN(highestSyncSeq)) {
        return false;
      }

      return parseInt(info.update_seq) <= highestSyncSeq;
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

        if (!ids.length) {
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

const writePurgeLog = (localDb, totalPurged, userCtx) => {
  return getPurgeLog(localDb).then(purgeLog => {
    const info = {
      date: new Date().getTime(),
      count: totalPurged,
      roles: JSON.stringify(purgingUtils.sortedUniqueRoles(userCtx.roles))
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

const purgeIds = (db, ids) => {
  let nbrPurged;
  return db
    .allDocs({ keys: ids })
    .then(result => {
      const purgedDocs = [];
      result.rows.forEach(row => {
        if (row.id && row.value) {
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
