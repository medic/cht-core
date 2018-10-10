var moment = require('moment'),
  uuid = require('uuid/v4');

angular
  .module('inboxServices')
  .factory('Telemetry', function($log, $q, $window, DB, Session) {
    'use strict';
    'ngInject';

    var queue = $q.resolve();

    // Intentionally scoped to the whole browser (for this domain). We can then
    // tell if multiple users use the same device
    var DEVICE_ID_KEY = 'medic-telemetry-device-id';

    // Intentionally scoped to the specific user, as they may perform a
    // different role (online vs. offline being being the most obvious) with
    // different performance implications
    var DB_ID_KEY = ['medic', Session.userCtx().name, 'telemetry-db'].join('-');
    var LAST_AGGREGATED_DATE_KEY = [
      'medic',
      Session.userCtx().name,
      'telemetry-date',
    ].join('-');

    var getDb = function() {
      var dbName = $window.localStorage.getItem(DB_ID_KEY);
      if (!dbName) {
        dbName =
          'medic-user-' + Session.userCtx().name + '-telemetry-' + uuid();
        $window.localStorage.setItem(DB_ID_KEY, dbName);
      }
      return $window.PouchDB(dbName); // avoid angular-pouch as digest isn't necessary here
    };

    var getUniqueDeviceId = function() {
      var uniqueDeviceId = $window.localStorage.getItem(DEVICE_ID_KEY);
      if (!uniqueDeviceId) {
        uniqueDeviceId = uuid();
        $window.localStorage.setItem(DEVICE_ID_KEY, uniqueDeviceId);
      }

      return uniqueDeviceId;
    };

    var getLastAggregatedDate = function() {
      var date = parseInt(
        $window.localStorage.getItem(LAST_AGGREGATED_DATE_KEY)
      );
      if (!date) {
        date = Date.now();
        $window.localStorage.setItem(LAST_AGGREGATED_DATE_KEY, date);
      }
      return date;
    };

    var storeIt = function(db, key, value) {
      return db.post({
        key: key,
        value: value,
        date_recorded: Date.now(),
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

    var convertReduceToKeyValues = function(reduce) {
      var kv = {};
      reduce.rows.forEach(function(row) {
        kv[row.key] = row.value;
      });

      return kv;
    };

    var generateAggregateDocId = function(metadata) {
      return [
        'telemetry',
        metadata.year,
        metadata.month,
        metadata.user,
        metadata.deviceId,
      ].join('-');
    };

    var generateMetadataSection = function() {
      var date = moment(getLastAggregatedDate());
      return {
        year: date.year(),
        month: date.month(),
        user: Session.userCtx().name,
        deviceId: getUniqueDeviceId(),
        // REVIEWER: is there anything else we think we should store here?
        // Candidates would be generic metadata that is not directly device
        // related or DB related
      };
    };

    var generateDeviceStats = function() {
      return {
        userAgent: $window.navigator.userAgent,
        language: $window.navigator.language,
        hardwareConcurrency: $window.navigator.hardwareConcurrency,
        screen: {
          width: $window.screen.availWidth,
          height: $window.screen.availHeight,
        },
        // REVIEWER: while we can expand this in the future are their other
        // useful things you would like to see here?
        //
        // REVIEWER: do we want to ship with extra data pulled from Android via
        // medic-android? This would allow us to know true android version, disk
        // space, stuff like that.
      };
    };

    // This should never happen (famous last words..), because we should only
    // generate a new document for every month, which is part of the _id.
    var storeConflictedAggregate = function(aggregateDoc) {
      aggregateDoc.metadata.conflicted = true;
      aggregateDoc._id = [aggregateDoc._id, 'conflicted', Date().now()].join(
        '-'
      );
      return DB().put(aggregateDoc);
    };

    var aggregate = function(db) {
      return $q
        .all([
          db.query(
            {
              map: function(doc, emit) {
                emit(doc.key, doc.value);
              },
              reduce: '_stats',
            },
            {
              group: true,
            }
          ),
          DB().info(),
        ])
        .then(function(qAll) {
          var reduceResult = qAll[0];
          var infoResult = qAll[1];

          var aggregateDoc = {
            type: 'telemetry',
          };

          // REVIEWER: is there a better name than 'stats' for aggregated telemetry records?
          aggregateDoc.stats = convertReduceToKeyValues(reduceResult);
          aggregateDoc.metadata = generateMetadataSection();
          aggregateDoc._id = generateAggregateDocId(aggregateDoc.metadata);
          aggregateDoc.device = generateDeviceStats();
          aggregateDoc.dbInfo = infoResult;

          return DB()
            .put(aggregateDoc)
            .catch(function(err) {
              if (err.status === 409) {
                return storeConflictedAggregate(aggregateDoc);
              }

              throw err;
            });
        });
    };

    var reset = function(db) {
      $window.localStorage.removeItem(DB_ID_KEY);
      $window.localStorage.removeItem(LAST_AGGREGATED_DATE_KEY);
      return db.destroy();
    };

    return {
      //
      // Records a piece of telemetry.
      //
      // Specifically, a unique key that will be aggregated against, and if you
      // are recording a timing (as opposed to an event) a value.
      //
      // While this function returns a promise, this is primarily for testing.
      // It is not recommended you hold on to this promise and wait for it to
      // resolve for performance reasons.
      //
      // @param      {String}   key     a unique key that will be aggregated
      //                                against later
      // @param      {Number}   value   number to be aggregated. Defaults to 1.
      // @return     {Promise}  resolves once the data has been recorded and
      //                        aggregated if required
      //
      record: function(key, value) {
        if (value === undefined) {
          value = 1;
        }

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
