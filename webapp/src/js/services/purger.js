angular
  .module('inboxServices')
  .factory('Purger', function($log, $q, $window, DB, Search) {
    'use strict';
    'ngInject';

    const LAST_PURGED_DATE_KEY = 'medic-last-purge-date';
    const daysToMs = (days) => 1000 * 60 * 60 * 24 * days;

    const getConfig = () => {
      // TODO: actually pull config out of whereever we want to store it via Config service
      return $q.resolve({
        fn: 'function(contact, reports) { return reports.map(r => r._id); }',
        run_every_days: '0'
      });
    };

    const urgeToPurge = (days) => {
      const now = Date.now();
      const lastPurge = parseInt(
        $window.localStorage.getItem(LAST_PURGED_DATE_KEY)
      );

      if (!lastPurge || (now - daysToMs(days)) > lastPurge) {
        $window.localStorage.setItem(LAST_PURGED_DATE_KEY, now);
        return true;
      } else {
        $log.info(`No purge needed yet. Last purge ${new Date(lastPurge)}`);
        return false;
      }
    };

    const reportsByContact = (contacts, reports) => {
      const reportsByContactId = reports.reduce((acc, report) => {
        const contactId = report.contact._id;

        if (!acc[contactId]) {
          acc[contactId] = [report];
        } else {
          acc[contactId].push(report);
        }

        return acc;
      }, {});

      return contacts.map(contact => ({
        contact: contact,
        reports: reportsByContactId[contact._id]
      })).filter(cm => cm.reports);
    };

    const purgeContact = (fn, {contact, reports}, purgeCount) => {
      console.log(contact, reports, purgeCount);

      const purgeResults = fn(contact, reports);

      console.log(purgeResults);

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
          $log.warn(`Configured purge function attempted to purge ${id}, which was not a report id passed to it`);
        }
      });

      const toPurge = safePurgeResults.map(id => ({
        _id: id,
        _rev: reportsById[id]._rev,
        _deleted: true
      }));

      return DB().bulkDocs(toPurge)
        .then(() => {
          // TODO: filter results for errors etcetera?

          return purgeCount + toPurge.length;
        });
    };

    const compile = fnStr => {
      /* jshint -W061 */
      return eval(`(${fnStr})`);
    };

    const purge = (fnStr) => {
      $log.debug('Searching for contacts to purge documents from');
      var options = {
        limit: 99999999,
        force: true,
        include_docs: true
      };
      return $q.all([
        Search('reports', {}, options),
        Search('contacts', {}, options)
      ])
        .then(function([reports, contacts]) {
          if (!reports.length) {
            $log.debug('No reports, aborting purge');
            return;
          }
          const fn = compile(fnStr);

          const sets = reportsByContact(contacts, reports);

          return sets.reduce(
            (p, set) => p.then(purgeCount => purgeContact(fn, set, purgeCount)),
            $q.resolve(0));
        });
    };

    return function() {
      $log.info('Initiating purge');
      return getConfig()
      .then(config => {
        if (config && urgeToPurge(config.run_every_days)) {
          return purge(config.fn);
        } else {
          return 0;
        }
      })
      .then(purgeCount => {
        $log.info(`Purge complete, purged ${purgeCount} documents`);
        return purgeCount;
      })
      .catch(err => {
        $log.error('Purging service failed');
        $log.error(err);
      });
    };
  });
