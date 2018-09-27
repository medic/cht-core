var moment = require('moment'),
  uuid = require('uuid/v4');

angular
  .module('inboxServices')
  .factory('Telemetry', function($log, $q, $timeout, $window, DB, Session) {
    'use strict';
    'ngInject';

    var queue = $q.resolve();

    var DEVICE_ID_KEY = 'medic-telemetry-device-id';
    var DB_ID_KEY = ['medic', Session.userCtx().name, 'telemetry-db'].join('-');
    var LAST_AGGREGATED_DATE_KEY = [
      'medic',
      Session.userCtx().name,
      'telemetry-date',
    ].join('-');

    var getDb = function() {
      var dbName = window.localStorage.getItem(DB_ID_KEY);
      if (!dbName) {
        dbName =
          'medic-user-' + Session.userCtx().name + '-telemetry-' + uuid();
        window.localStorage.setItem(DB_ID_KEY, dbName);
      }
      return $window.PouchDB(dbName); // avoid angular-pouch as digest isn't necessary here
    };

    var getUniqueDeviceId = function() {
      var uniqueDeviceId = window.localStorage.getItem(DEVICE_ID_KEY);
      if (!uniqueDeviceId) {
        uniqueDeviceId = uuid();
        window.localStorage.setItem(DEVICE_ID_KEY, uniqueDeviceId);
      }

      return uniqueDeviceId;
    };

    var getLastAggregatedDate = function() {
      var date = parseInt(
        window.localStorage.getItem(LAST_AGGREGATED_DATE_KEY)
      );
      if (!date) {
        date = Date.now();
        window.localStorage.setItem(LAST_AGGREGATED_DATE_KEY, date);
      }
      return date;
    };

    var storeIt = function(db, key, value) {
      return db.post({
        key: key,
        value: value,
      });
    };

    var submitIfNeeded = function(db) {
      var monthStart = moment().startOf('month');
      var dbDate = moment(getLastAggregatedDate());
      if (dbDate.isBefore(monthStart)) {
        return aggregate(db).then(function() {
          return reset(db);
        });
      }
    };

    var generateAggregateDocId = function(metadata) {
      return [
        'telemetry',
        metadata.year,
        metadata.month,
        metadata.user,
        metadata.deviceId,
        // TODO: don't commit
        '[][][][]',
        uuid(),
      ].join('-');
    };

    var generateMetadataSection = function() {
      var date = moment(getLastAggregatedDate());
      return {
        year: date.year(),
        month: date.month(),
        user: Session.userCtx().name,
        deviceId: getUniqueDeviceId(),
        // TODO: more?
      };
    };

    var generateDeviceStats = function() {
      return {
        userAgent: navigator.userAgent,
        language: navigator.language,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: navigator.deviceMemory,
        // TODO: more!
      };
    };

    var aggregate = function(db) {
      return db
        .query(
          {
            map: function(doc, emit) {
              emit(doc.key, doc.value);
            },
            reduce: '_stats',
          },
          {
            group: true,
          }
        )
        .then(function(results) {
          var aggregateDoc = {
            rows: {},
          };
          results.rows.forEach(function(row) {
            aggregateDoc.rows[row.key] = row.value;
          });

          aggregateDoc.type = 'telemetry';

          aggregateDoc.metadata = generateMetadataSection();
          aggregateDoc._id = generateAggregateDocId(aggregateDoc.metadata);
          aggregateDoc.device = generateDeviceStats();
          return DB()
            .info()
            .then(function(result) {
              aggregateDoc.dbInfo = result;

              return DB().put(aggregateDoc);
            });
        });
    };

    var reset = function(db) {
      window.localStorage.removeItem(DB_ID_KEY);
      window.localStorage.removeItem(LAST_AGGREGATED_DATE_KEY);
      return db.destroy();
    };

    return {
      // TODO: note that you shouldn't hold on to the promise in prod
      record: function(key, value) {
        var db;
        queue = queue
          .then(function() {
            db = getDb();
          })
          .then(function() {
            return storeIt(db, key, value);
          })
          .then(function() {
            return submitIfNeeded(db);
          })
          .catch(function(err) {
            $log.error('Error in telemetry service', err);
          });

        return queue;
      },
    };
  });
