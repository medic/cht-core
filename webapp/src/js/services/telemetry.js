var moment = require('moment'),
  uuid = require('uuid/v4');

angular
  .module('inboxServices')
  .factory('Telemetry', function(
    $log,
    $q,
    $window,
    DB,
    Session
  ) {
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
        // We're adding a UUID onto the end of the DB name to make it unique. In
        // the past we've had trouble with PouchDB being able to delete a DB and
        // then instantly create a new DB with the same name.
        dbName = 'medic-user-' + Session.userCtx().name + '-telemetry-' + uuid();
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
      return $q.all([
          DB().get('_design/medic-client'),
          DB().query('medic-client/forms', {include_docs: true})
      ]).then(([ddoc, formResults]) => {
        const date = moment(getLastAggregatedDate());
        const version = (ddoc.deploy_info && ddoc.deploy_info.version) || 'unknown';
        const forms = formResults.rows.reduce((keyToVersion, row) => {
          keyToVersion[row.key] = row.doc._rev;

          return keyToVersion;
        }, {});

        return {
          year: date.year(),
          month: date.month(),
          user: Session.userCtx().name,
          deviceId: getUniqueDeviceId(),
          versions: {
            app: version,
            forms: forms
          }
        };
      });
    };

    var generateDeviceStats = function() {
      return {
        userAgent: $window.navigator.userAgent,
        hardwareConcurrency: $window.navigator.hardwareConcurrency,
        screen: {
          width: $window.screen.availWidth,
          height: $window.screen.availHeight,
        },
        // TODO: expose some device information in the medic-android wrapper
        // and pull it in here. Device memory, phone type, stuff like that
        //
        // https://github.com/medic/medic/issues/4882
      };
    };

    // This should never happen (famous last words..), because we should only
    // generate a new document for every month, which is part of the _id.
    var storeConflictedAggregate = function(aggregateDoc) {
      aggregateDoc.metadata.conflicted = true;
      aggregateDoc._id = [aggregateDoc._id, 'conflicted', Date.now()].join('-');
      return DB({meta: true}).put(aggregateDoc);
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
          generateMetadataSection()
        ])
        .then(function(qAll) {
          var reduceResult = qAll[0];
          var infoResult = qAll[1];
          var metadata = qAll[2];

          var aggregateDoc = {
            type: 'telemetry',
          };

          aggregateDoc.metrics = convertReduceToKeyValues(reduceResult);
          aggregateDoc.metadata = metadata;
          aggregateDoc._id = generateAggregateDocId(aggregateDoc.metadata);
          aggregateDoc.device = generateDeviceStats();
          aggregateDoc.dbInfo = infoResult;

          return DB({meta: true})
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
      // The first time this API is called each month, the telemetry recording
      // is followed by an aggregation of all of the previous months data.
      // Aggregation is done using the `_stats` reduce function, which
      // generates data like so:
      //
      // {
      //   metric_a:  { sum: 492, min: 123, max: 123, count: 4, sumsqr: 60516 },
      //   metric_b:  { sum: -16, min: -4, max: -4, count: 4, sumsqr: 64 }
      // }
      //
      // See: https://wiki.apache.org/couchdb/Built-In_Reduce_Functions#A_stats
      //
      // This single month aggregate document is of type 'telemetry', and is
      // stored in the user's meta DB (which replicates up to the main server)
      //
      // TODO: get all telemetry docs aggregate script, document it's existance here
      //    https://github.com/medic/medic/issues/4968
      //
      // NOTE: While this function returns a promise, this is primarily for
      // testing. It is not recommended you hold on to this promise and wait
      // for it to resolve, for performance reasons.
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
