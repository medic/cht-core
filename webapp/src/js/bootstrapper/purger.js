const LAST_PURGED_DATE_KEY = 'medic-last-purge-date';
const daysToMs = (days) => 1000 * 60 * 60 * 24 * days;

/*
 * Handlers supported
 * done: called once all purging is complete, first param to callback is
 * total documents purged
 * start: called once we know how many contacts need to be looked through, returns
 * the count of contacts
 * progress: called every so often, with updated progress TODO: explanation
*/
module.exports = function(DB) {

  const getConfig = () => {
    // TODO: actually pull config out of the ddoc
    return Promise.resolve({
      fn: 'function(contact, reports) { return reports.map(r => r._id); }',
      run_every_days: '0'
    });
  };

  const urgeToPurge = (days) => {
    const now = Date.now();
    const lastPurge = parseInt(
      window.localStorage.getItem(LAST_PURGED_DATE_KEY)
    );

    if (!lastPurge || (now - daysToMs(days)) > lastPurge) {
      window.localStorage.setItem(LAST_PURGED_DATE_KEY, now);
      return true;
    } else {
      console.log(`No purge needed yet. Last purge ${new Date(lastPurge)}`);
      return false;
    }
  };

  const purgeContact = (fn, {contact, reports}, purgeCount) => {
    const purgeResults = fn(contact, reports);

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
      _deleted: true
    }));

    return DB.bulkDocs(toPurge)
      .then(() => {
        // TODO: filter results for errors etcetera?

        return purgeCount + toPurge.length;
      });
  };

  const compile = fnStr => {
    /* jshint -W061 */
    return eval(`(${fnStr})`);
  };

  const reportsByContact = () => {
    // TODO: in the future this is a great place for a quick-indexing mango query
    return DB.allDocs({include_docs: true})
      .then(results => {
        const {
          contactsByContactId,
          reportsByContactId
        } = results.rows.reduce((acc, row) => {
          const doc = row.doc;
          if (doc.type === 'data_record') {
            if (!acc.reportsByContactId[doc.contact._id]) {
              acc.reportsByContactId[doc.contact._id] = [doc];
            } else {
              acc.reportsByContactId[doc.contact._id].push(doc);
            }
          }

          if (['district_hospital', 'health_center', 'clinic', 'person'].includes(doc.type)) {
            acc.contactsByContactId[doc._id] = doc;
          }

          return acc;
        }, {contactsByContactId: {}, reportsByContactId: {}});

        return Object.keys(reportsByContactId)
          .map(id => ({
            contact: contactsByContactId[id],
            reports: reportsByContactId[id]
          }));
      });
  };

  const purge = (fnStr) => {
    console.debug('Searching for contacts to purge documents from');
    return reportsByContact()
      .then(function(sets) {
        if (!sets.length) {
          console.debug('No reports, aborting purge');
          return 0;
        }

        const fn = compile(fnStr);

        publish('start', sets.length);

        // Reviewer: I am not a fan of having this mutably outside of the reduce
        // but it's also weird to pass more meta around in the reduce flow, purgeCount
        // is more than enough IMO. Unsure here..
        let setsLeft = sets.length;

        return sets.reduce(
          (p, set) => p
            .then(purgeCount => purgeContact(fn, set, purgeCount))
            .then(purgeCount => {
              publish('progress', {purged: purgeCount, contactsLeft: --setsLeft});
              return purgeCount;
            }),
          Promise.resolve(0));
      });
  };

  const begin = () => {
    console.log('Initiating purge');
    return getConfig()
    .then(config => {
      if (config && urgeToPurge(config.run_every_days)) {
        return purge(config.fn);
      } else {
        return 0;
      }
    })
    .then(purgeCount => {
      console.log(`Purge complete, purged ${purgeCount} documents`);
      return purgeCount;
    });
  };

  const handlers = {};
  const publish = (name, arguments) => {
    (handlers[name] || []).forEach(callback => {
      callback.apply(null, arguments);
    });
  };

  const p = Promise.resolve()
    .then(() => begin())
    .then(count => publish('done', count));

  p.on = (type, callback) => {
    handlers.type = handlers.type || [];
    handlers.type.push(callback);
  };

  return p;
};
