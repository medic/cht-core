const LAST_PURGED_DATE_KEY = 'medic-last-purge-date';
const LAST_REPLICATED_SEQ_KEY = 'medic-last-replicated-seq';

const daysToMs = (days) => 1000 * 60 * 60 * 24 * days;
/*
 * Determines if purging should occur, and performs it if it should, resolving
 * the returned promise once the entire interaction is complete.
 *
 * You can follow along with published events:
 *
 * purge(DB)
 *  .on('start', ...)
 *  .on('progress, ...)
 *  .on('optimise', ...)
 *  .on('done', ...);
 *
 * start: fired once we've worked out what to purge, callback is passed 'totalContacts'
 * progress: fired after every contact has had purge run over it, callback is passed
 *   an object containing progress information and current purge count
 * optimise: fired just before compaction is run. We cannot introspect this effort
 *   and it may take some time to complete
 * done: fired once everything is complete, callback is passed the total purge count
*/
module.exports = function(DB, initialReplication) {

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

  const purgeContact = (fn, {contact, reports}, purgeCount) => {
    let purgeResults;
    try {
      purgeResults = fn(contact, reports);
    } catch (err) {
      console.error('Purge function threw an exception, skipping this set', err);
      console.error({passed: {contact: contact, reports: reports}});
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
      console.error(`Failed to parse purge function!\n  ${fnStr}\nFailed with:\n  ${err}`);
      throw new Error(`Failed to parse purge function: ${err}`);
    }
  };

  // Copied and slightly modified from the rules-service:
  // https://github.com/medic/medic-webapp/blob/master/webapp/src/js/services/rules-engine.js#L52-L67
  // We want to be consistent with rules
  var getContactId = function(doc) {
    // get the associated patient or place id to group reports by
    return doc && (
      doc.patient_id ||
      doc.place_id ||
      (doc.fields && (doc.fields.patient_id || doc.fields.place_id || doc.fields.patient_uuid))
    );
  };
  var contactHasId = function(contact, id) {
    return contact && (
      contact._id === id ||
      contact.patient_id === id ||
      contact.place_id === id
    );
  };

  const reportsByContact = () => {
    // TODO: in the future this is a great place for a quick-indexing mango query
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
          }

          if (['district_hospital', 'health_center', 'clinic', 'person'].includes(doc.type)) {
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
  };

  const purge = (fnStr) => {
    return reportsByContact()
      .then(function(sets) {
        if (!sets.length) {
          return 0;
        }

        const fn = compile(fnStr);
        const total = sets.length;
        let processed = 0;

        publish('start', {totalContacts: total});
        return sets.reduce(
          (p, set) => p
            .then(purgeCount => purgeContact(fn, set, purgeCount))
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

  const begin = () => {
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
              return purge(config.fn)
                .then(purgeCount => {
                  console.log(`Purge complete, purged ${purgeCount} documents`);

                  window.localStorage.setItem(LAST_PURGED_DATE_KEY, Date.now());

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
    .then(() => begin())
    .then(count => {
      if (count) {
        publish('optimise');
        return DB.compact().then(() => count);
      } else {
        return count;
      }
    })
    .then(count => publish('done', {totalPurged: count}));

  p.on = (type, callback) => {
    handlers[type] = handlers[type] || [];
    handlers[type].push(callback);
    return p;
  };

  return p;
};

module.exports.LAST_REPLICATED_SEQ_KEY = LAST_REPLICATED_SEQ_KEY;
