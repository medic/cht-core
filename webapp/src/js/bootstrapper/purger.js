const utils = require('./utils'),
      registrationUtils = require('@medic/registration-utils');

const LAST_PURGED_DATE_KEY = 'medic-last-purge-date';
const LAST_REPLICATED_SEQ_KEY = 'medic-last-replicated-seq';
const LAST_PURGE_FN_HASH = 'medic-last-purge-fn-hash';

const daysToMs = (days) => 1000 * 60 * 60 * 24 * days;

// From https://stackoverflow.com/a/7616484/1666
// with minor ES6 and formatting changes
const hash = str => {
    let hash = 0;

    if (str.length === 0) {
        return hash;
    }

    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        /* eslint-disable no-bitwise */
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
        /* eslint-enable no-bitwise */
    }

    return hash;
};
/*
 * Determines if purging should occur, and performs it if it should, resolving
 * the returned promise once the entire interaction is complete.
 *
 * You can follow along with published events:
 *
 * purge(DB)
 *  .on('start', ...)
 *  .on('progress, ...)
 *  .on('done', ...);
 *
 * start: fired once we've decided that we are going to purge this session
 * progress: fired after every contact has had purge run over it, callback is passed
 *   an object containing progress information and current purge count
 * done: fired once everything is complete, callback is passed the total purge count
*/
module.exports = function(DB, userCtx, initialReplication) {
  const MAX_ERROR_COUNT = 10;
  let errorCount = 0;
  const feedback = msg => {
    errorCount += 1;
    if (errorCount <= MAX_ERROR_COUNT) {
      utils.feedback(msg);
    }
  };

  const getConfig = () => {
    return DB.get('settings')
      .then(({settings: {purge}}) => {
        if (!(purge && purge.fn)) {
          // No function means no purge
          return;
        }

        purge.run_every_days = parseInt(purge.run_every_days);
        if (Number.isNaN(purge.run_every_days)) {
          purge.run_every_days = 30;
        }

        return purge;
      });
  };

  const purgeFnChanged = fn => {
    const lastPurgeHash = parseInt(
      window.localStorage.getItem(LAST_PURGE_FN_HASH)
    );

    return !lastPurgeHash || lastPurgeHash !== hash(fn);
  };

  const purgedRecently = days => {
    const lastPurge = parseInt(
      window.localStorage.getItem(LAST_PURGED_DATE_KEY)
    );

    return lastPurge && (Date.now() - daysToMs(days)) < lastPurge;
  };

  const localDatabaseReplicated = () => {
    const highestSyncSeq = parseInt(
      window.localStorage.getItem(LAST_REPLICATED_SEQ_KEY)
    );

    if (!highestSyncSeq) {
      return Promise.resolve(false);
    }

    // I can't imagine how this would happen, but <= is arguably more correct
    // than === so we'll go with that
    return DB.info().then(info => parseInt(info.update_seq) <= highestSyncSeq);
  };

  const urgeToPurge = config => {
    if (initialReplication) {
      console.log('Initial replication just occured, running post-replication purge');
      return Promise.resolve(true);
    }

    if (purgeFnChanged(config.fn)) {
      console.log('Purge function has changed, running purge');
      return Promise.resolve(true);
    }

    if (purgedRecently(config.run_every_days)) {
      console.log('Previous purge was recently, skipping');
      return Promise.resolve(false);
    }

    return localDatabaseReplicated().then(replicated => {
      if (replicated) {
        console.log('Local DB does not appear to have unreplicated records');
      } else {
        console.log('Local DB may have unreplicated records, skipping');
      }

      return replicated;
    });
  };

  const purgeContact = (fn, userCtx, {contact, reports}, purgeCount) => {
    let purgeResults;
    try {
      purgeResults = fn(userCtx, contact, reports);
    } catch (err) {
      console.error('Purge function threw an exception, skipping this set', err);
      console.error({passed: {contact: contact, reports: reports}});

      feedback('Failed to execute purge function: ' + err);

      return purgeCount;
    }

    if (!purgeResults || !purgeResults.length) {
      return purgeCount;
    }

    const reportsById = reports.reduce((acc, r) => {
      acc[r._id] = r;
      return acc;
    }, {});

    const safePurgeResults = purgeResults.filter(id => {
      if (reportsById[id]) {
        return true;
      } else {
        console.warn(`Configured purge function attempted to purge ${id}, which was not a report id passed to it`);
        feedback(`Illegal purge attempted on ${id}`);
      }
    });

    const toPurge = safePurgeResults.map(id => ({
      _id: id,
      _rev: reportsById[id]._rev,
      _deleted: true,
      purged: true
    }));

    return DB.bulkDocs(toPurge)
      .then(() => {
        // TODO: filter results for errors etcetera?

        return purgeCount + toPurge.length;
      });
  };

  const compile = fnStr => {
    try {
      /* jshint -W061 */
      return eval(`(${fnStr})`);
    } catch (err) {
      feedback(`Failed to parse purge function: ${err}`);
      throw new Error(`Failed to parse purge function!\n  ${fnStr}\nFailed with:\n  ${err}`);
    }
  };

  var getContactId = function(doc) {
    // get the associated patient or place id to group reports by
    return registrationUtils.getPatientId(doc);
  };
  var contactHasId = function(contact, id) {
    return registrationUtils.getSubjectIds(contact).includes(id);
  };

  const getContactTypeIds= () => {
    return DB.get('settings')
      .then(doc => doc.settings.contact_types || [])
      .then(types => types.map(type => type.id));
  };

  const reportsByContact = () => {
    // TODO: in the future this is a great place for a quick-indexing mango query
    return getContactTypeIds().then(contactTypeIds => {
      return DB.allDocs({include_docs: true})
        .then(results => {
          const {
            contacts,
            reportsByContactId
          } = results.rows.reduce((acc, row) => {
            const doc = row.doc;
            if (doc.type === 'data_record') {
              const relevantContactId = getContactId(doc);

              if (!acc.reportsByContactId[relevantContactId]) {
                acc.reportsByContactId[relevantContactId] = [doc];
              } else {
                acc.reportsByContactId[relevantContactId].push(doc);
              }
            } else if (contactTypeIds.includes(doc.contact_type || doc.type)) {
              acc.contacts.push(doc);
            }

            return acc;
          }, {contacts: [], reportsByContactId: {}});

          return Object.keys(reportsByContactId)
            .map(id => ({
              contact: contacts.find(c => contactHasId(c, id)),
              reports: reportsByContactId[id]
            }));
        });
    });
  };

  const purge = (fnStr, userCtx) => {
    return reportsByContact()
      .then(sets => {
        if (!sets.length) {
          return 0;
        }

        const fn = compile(fnStr);
        const total = sets.length;
        let processed = 0;

        return sets.reduce(
          (p, set) => p
            .then(purgeCount => purgeContact(fn, userCtx, set, purgeCount))
            .then(purgeCount => {
              publish('progress', {
                purged: purgeCount,
                processed: ++processed,
                total: total
              });
              return purgeCount;
            }),
          Promise.resolve(0));
      });
  };

  const begin = (userCtx) => {
    console.log('Initiating purge');
    return getConfig()
      .then(config => {
        if (!config) {
          console.log('No purge rules configured, skipping');
          return 0;
        }

        return urgeToPurge(config)
          .then(shouldPurge => {
            if (shouldPurge) {
              publish('start');

              return purge(config.fn, userCtx)
                .then(purgeCount => {
                  console.log(`Purge complete, purged ${purgeCount} documents`);

                  window.localStorage.setItem(LAST_PURGED_DATE_KEY, Date.now());
                  window.localStorage.setItem(LAST_PURGE_FN_HASH, hash(config.fn));

                  return purgeCount;
                });
            } else {
              return 0;
            }
          });
      });
  };

  const handlers = {};
  const publish = (name, event) => {
    console.debug(`Publishing '${name}' event with:`, event);

    (handlers[name] || []).forEach(callback => {
      callback(event);
    });
  };

  const p = Promise.resolve()
    .then(() => begin(userCtx))
    .then(count => publish('done', {totalPurged: count}));

  p.on = (type, callback) => {
    handlers[type] = handlers[type] || [];
    handlers[type].push(callback);
    return p;
  };

  return p;
};

module.exports.LAST_REPLICATED_SEQ_KEY = LAST_REPLICATED_SEQ_KEY;
