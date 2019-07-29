const db = require('../db');
const environment = require('../environment');
const cache = require('./cache');
const crypto = require('crypto');
const request = require('request-promise-native');
const registrationUtils = require('@medic/registration-utils');
const config = require('../config');
const logger = require('../logger');
const { performance } = require('perf_hooks');

const BATCH_SIZE = 1000;

const purgeDbs = {};
const getRoleHash = roles => crypto
  .createHash('md5')
  .update(JSON.stringify(roles.sort()), 'utf8')
  .digest('hex');

const getPurgeDb = roles => {
  const hash = typeof roles === 'string' ? roles : getRoleHash(roles);
  if (!purgeDbs[hash]) {
    purgeDbs[hash] = db.get(`${environment.db}-purged-role-${hash}`)
  }
  return purgeDbs[hash];
};

const getCacheKey = (roles, docIds) => {
  const hash = crypto
    .createHash('md5')
    .update(JSON.stringify(docIds), 'utf8')
    .digest('hex');

  return `purged-${JSON.stringify(roles)}-${hash}`;
};

const getPurgedId = id => `purged:${id}`;
const extractId = purgedId => purgedId.replace(/^purged:/, '');

const getPurgedIdsFromChanges = result => {
  const purgedIds = [];
  result.results.forEach(change => {
    if (!change.deleted) {
      purgedIds.push(extractId(change.id));
    }
  });
  return purgedIds;
};

const getPurgedIds = (roles, docIds) => {
  const cacheKey = getCacheKey(roles, docIds);
  const cached = cache.get(cacheKey);
  if (cached) {
    cache.ttl(cacheKey);
    return Promise.resolve(cached);
  }

  const purgeDb = getPurgeDb(roles);
  const ids = docIds.map(getPurgedId);

  return purgeDb
    .changes({ doc_ids: ids, batch_size: ids.length + 1, seq_interval: ids.length })
    .then(result => getPurgedIdsFromChanges(result));
};

const getPurgedIdsSince = (roles, docIds, { checkPointerId = '', limit = 100 } = {}) => {
  const purgeDb = getPurgeDb(roles);
  const ids = docIds.map(getPurgedId);

  return getCheckPointer(purgeDb, checkPointerId)
    .then(checkPointer => {
      const opts = {
        doc_ids: ids,
        batch_size: ids.length + 1,
        limit: limit,
        since: checkPointer.last_seq,
        seq_interval: ids.length
      };

      return purgeDb.changes(opts);
    })
    .then(result => {
      const purgedDocIds = getPurgedIdsFromChanges(result);
      return {
        purgedDocIds,
        lastSeq: result.last_seq
      };
    });
};

const getCheckPointer = (db, checkPointerId) => db
  .get(`_local/${checkPointerId}`)
  .catch(() => ({
    _id: `_local/${checkPointerId}`,
    last_seq: 0
  }));

const writeCheckPointer = (roles, checkPointerId, seq = 0) => {
  const purgeDb = getPurgeDb(roles);

  return Promise
    .all([
      getCheckPointer(purgeDb, checkPointerId),
      purgeDb.info()
    ])
    .then(([ checkPointer, info ]) => {
      checkPointer.last_seq = seq === 'now' ? info.update_seq : seq;
      purgeDb.put(checkPointer);
    });
};

const getRoles = () => {
  const list = {};
  const roles = {};

  // todo restrict to just offline roles!!!

  return db.users
    .allDocs({ include_docs: true })
    .then(result => {
      result.rows.forEach(row => {
        if (!row.doc.roles) {
          return;
        }
        const r = JSON.stringify(row.doc.roles.sort());
        list[r] = row.doc.roles;
      });

      Object.values(list).forEach(list => {
        const hash = getRoleHash(list);
        roles[hash] = list;
      });

      return roles;
    });
};

const initPurgeDbs = (roles) => {
  return Promise.all(Object.keys(roles).map(hash => {
    const purgeDb = getPurgeDb(hash);
    return purgeDb.put({ _id: 'local/info', roles: roles[hash] }).catch(() => {}); // catch 409s here
  }))
};

const getExistentPurgedDocs = (roles, ids) => {
  const purgeIds = ids.map(id => getPurgedId(id));
  const roleHashes = Object.keys(roles);
  const changesOpts = {
    doc_ids: purgeIds,
    batch_size: purgeIds.length + 1,
    seq_interval: purgeIds.length
  };

  return Promise
    .all(roleHashes.map(hash => getPurgeDb(hash).changes(changesOpts)))
    .then(results => {
      const purged = {};
      results.forEach((result, idx) => {
        const hash = roleHashes[idx];
        purged[hash] = {};
        result.results.forEach(change => {
          if (!change.deleted) {
            purged[hash][extractId(change.id)] = change.changes[0].rev;
          }
        })
      });

      return purged;
    });
};

const getPurgeFn = () => {
  const purgeConfig = config.get('purge');
  console.log(purgeConfig);
  if (!purgeConfig || !purgeConfig.fn) {
    return;
  }

  try {
    /* jshint -W061 */
    return eval(`(${purgeConfig.fn})`);
  } catch (err) {
    logger.error('Failed to parse purge function: %o', err);
  }
};

const updatePurgedDocs = (roles, ids, currentlyPurged, newPurged) => {
  const docs = {};
  const rolesHashes = Object.keys(roles);

  ids.forEach(id => {
    rolesHashes.forEach(hash => {
      if (!docs[hash]) {
        docs[hash] = [];
      }
      const isPurged = currentlyPurged[hash][id];
      const shouldPurge = newPurged[hash][id];

      // do nothing if purge state is unchanged
      if (!!isPurged === !!shouldPurge) {
        return;
      }

      if (isPurged) {
        docs[hash].push({ _id: getPurgedId(id), _rev: isPurged, _deleted: true });
      } else {
        docs[hash].push({ _id: getPurgedId(id) });
      }
    });
  });

  return Promise.all(rolesHashes.map(hash => {
    if (!docs[hash] || !docs[hash].length) {
      return Promise.resolve([]);
    }

    return getPurgeDb(hash).bulkDocs({ docs: docs[hash] });
  }))
};

const batchedContactsPurge = (roles, purgeFn, startKeyDocId = '') => {
  let nextKeyDocId;
  let contacts;
  const matchers = {};
  const docIds = [];

  logger.debug(`Starting contacts purge batch with id ${startKeyDocId}`);

  const queryString = {
    limit: BATCH_SIZE,
    keys: JSON.stringify([['district_hospital'], ['health_center'], ['clinic'], ['person']]),
    startkey_docid: startKeyDocId,
    include_docs: true
  };

  return request
    .get(`${environment.couchUrl}/_design/medic-client/_view/contacts_by_type`, { qs: queryString, json: true })
    .then(result => {
      contacts = result.rows.map(row => {
        if (row.id === startKeyDocId) {
          return;
        }

        nextKeyDocId = row.id;
        docIds.push(row.id);
        return row.doc;
      });

      const subjectIds = [];
      contacts.forEach(contact => {
        if (!contact) {
          return;
        }

        subjectIds.push(...registrationUtils.getSubjectIds(contact).map(subject => ([subject])));
        matchers[contact._id] = { contact, reports: [] };
      });

      return db.medic.query('medic-client/reports_by_subject', { keys: subjectIds, include_docs: true });
    })
    .then(result => {
      const reportsByContact = {};
      result.rows.forEach(row => {
        const patientId = registrationUtils.getPatientId(row.doc);
        if (!reportsByContact[patientId]) {
          reportsByContact[patientId] = [];
        }
        reportsByContact[patientId].push(row.doc);
        docIds.push(row.id);
      });

      Object.keys(reportsByContact).forEach(patientId => {
        const contact = contacts.find(contact => registrationUtils.getSubjectIds(contact).includes(patientId));
        matchers[contact._id].reports.push(...reportsByContact[patientId]);
      });

      return getExistentPurgedDocs(roles, docIds);
    })
    .then(currentlyPurged => {
      const purgedPerHash = {};
      const rolesHashes = Object.keys(roles);
      Object.keys(matchers).forEach(id => {
        rolesHashes.forEach(hash => {
          if (!purgedPerHash[hash]) {
            purgedPerHash[hash] = {};
          }

          const allowedIds = [id, ...matchers[id].reports.map(r => r._id)];
          purgeFn({ roles: roles[hash] }, matchers[id].contact, matchers[id].reports).forEach(id => {
            if (!allowedIds.includes(id)) {
              return;
            }
            purgedPerHash[hash][id] = true;
          });
        });
      });

      return updatePurgedDocs(roles, docIds, currentlyPurged, purgedPerHash);
    })
    .then(() => nextKeyDocId && batchedContactsPurge(roles, purgeFn, nextKeyDocId));
};

const batchedUnallocatedPurge = (roles, purgeFn, startKeyDocId = '') => {
  let nextKeyDocId;
  let reports;
  const docIds = [];
  const docs = {};

  logger.debug(`Starting unallocated purge batch with id ${startKeyDocId}`);

  const queryString = {
    limit: BATCH_SIZE,
    keys: JSON.stringify(['_unassigned']),
    startkey_docid: startKeyDocId,
    include_docs: true
  };

  return request
    .get(`${environment.couchUrl}/_design/medic/_view/docs_by_replication_key`, { qs: queryString, json: true })
    .then(result => {
      reports = result.rows.map(row => {
        if (row.id === startKeyDocId) {
          return;
        }

        nextKeyDocId = row.id;
        docIds.push(row.id);
        return row.doc;
      });

      return getExistentPurgedDocs(roles, docIds);
    })
    .then(currentlyPurged => {
      const purgedPerHash = {};
      const rolesHashes = Object.keys(roles);
      reports.forEach(doc => {
        rolesHashes.forEach(hash => {
          if (!purgedPerHash[hash]) {
            purgedPerHash[hash] = {};
          }

          purgeFn({ roles: roles[hash] }, [], [doc]).forEach(id => {
            if (id !== doc._id) {
              return;
            }
            purgedPerHash[hash][id] = true;
          });
        });
      });

      return updatePurgedDocs(roles, docIds, currentlyPurged, purgedPerHash);
    })
    .then(() => nextKeyDocId && batchedUnallocatedPurge(roles, purgeFn, nextKeyDocId));
};

const purge = () => {
  let roles;
  logger.info('Running server side purge');
  const purgeFn = getPurgeFn();
  if (!purgeFn) {
    logger.info('No purge function configured.');
    return;
  }

  const start = performance.now();
  return getRoles()
    .then(result => {
      roles = result;
      return initPurgeDbs(roles);
    })
    .then(() => batchedContactsPurge(roles, purgeFn))
    .then(() => batchedUnallocatedPurge(roles, purgeFn))
    .then(() => {
      logger.info(`Server Side Purge completed successfully in ${ (performance.now() - start) / 1000 / 60 } minutes`);
    });
};

module.exports = {
  getPurgedIds,
  getPurgedIdsSince,
  getCheckPointer,
  writeCheckPointer,
  purge,
};
