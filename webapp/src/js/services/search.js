var _ = require('underscore'),
    moment = require('moment'),
    Search = require('search');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  // To make it easier to mock out
  inboxServices.factory('SearchFactory',
    function(
      $q,
      DB
    ) {

      'ngInject';

      return function() {
        return Search($q, DB());
      };
    }
  );

  inboxServices.factory('Search',
    function(
      $log,
      $q,
      DB,
      GetDataRecords,
      SearchFactory,
      CalendarInterval
    ) {

      'ngInject';

      var _currentQuery = {};

      // Silently cancel repeated queries.
      var debounce = function(type, filters, options) {
        if (type === _currentQuery.type &&
          _.isEqual(filters, _currentQuery.filters) &&
          _.isEqual(options, _currentQuery.options)) {
          return true;
        }
        _currentQuery.type = type;
        _currentQuery.filters = Object.assign({}, filters);
        _currentQuery.options = Object.assign({}, options);
        return false;
      };

      var _search = SearchFactory();

      var getLastVisitedDates = function(searchResults, extendedResults, settings) {
        settings = settings || {};

        var interval = CalendarInterval.getCurrent(settings.monthStartDate),
            visitStats = {},
            promise;

        searchResults.forEach(function(id) {
          visitStats[id] = { lastVisitedDate: -1, visitDates: [] };
        });

        if (extendedResults) {
          extendedResults.forEach(function(row) {
            if (visitStats[row.key]) {
              visitStats[row.key].lastVisitedDate = row.value;
            }
          });

          promise = DB()
            .query('medic-client/visits_by_date', {
              start_key: interval.start,
              end_key: interval.end
            }).then(function(result) {
              result.rows.forEach(function (row) {
                if (visitStats[row.value]) {
                  visitStats[row.value].visitDates.push(moment(row.key).startOf('day').valueOf());
                }
              });
            });
        } else {
          promise = DB().query('medic-client/contacts_by_last_visited', {
            reduce: false,
            keys: searchResults
          }).then(function(result) {
            result.rows.forEach(function (row) {
              var stats = visitStats[row.key];

              stats.lastVisitedDate = Math.max(stats.lastVisitedDate, row.value);

              if (row.value >= interval.start && row.value <= interval.end) {
                stats.visitDates.push(moment(row.value).startOf('day').valueOf());
              }

              visitStats[row.key] = stats;
            });
          });
        }

        return promise.then(function() {
          return Object.keys(visitStats).map(function(key) {
            return {
              key: key,
              value: {
                lastVisitedDate: visitStats[key].lastVisitedDate,
                visitCount: _.uniq(visitStats[key].visitDates).length,
                visitCountGoal: settings.visitCountGoal
              }
            };
          });
        });
      };

      return function(type, filters, options, extensions, docIds) {
        $log.debug('Doing Search', type, filters, options, extensions);

        options = options || {};
        extensions = extensions || {};
        _.defaults(options, {
          limit: 50,
          skip: 0
        });

        if (!options.force && debounce(type, filters, options)) {
          return $q.resolve([]);
        }

        return _search(type, filters, options, extensions)
          .then(function(searchResults) {
            var extendedResults;
            if (_.isObject(searchResults) && searchResults.extendedResults) {
              extendedResults = searchResults.extendedResults;
              searchResults = searchResults.results;
            }

            if (docIds && docIds.length) {
              docIds.forEach(function(docId) {
                if (searchResults.indexOf(docId) === -1) {
                  searchResults.push(docId);
                }
              });
            }
            var dataRecordsPromise = GetDataRecords(searchResults, options);

            if (!extensions.displayLastVisitedDate) {
              return dataRecordsPromise;
            }

            var lastVisitedDatePromise = getLastVisitedDates(searchResults, extendedResults, extensions.visitCountSettings);

            return $q.all({
              dataRecords: dataRecordsPromise,
              lastVisitedDates: lastVisitedDatePromise
            }).then(function(r) {
              r.lastVisitedDates.forEach(function(dateResult) {
                var relevantDataRecord = r.dataRecords.find(function(dataRecord) {
                  return dataRecord._id === dateResult.key;
                });

                if (relevantDataRecord) {
                  _.extend(relevantDataRecord, dateResult.value);
                  relevantDataRecord.sortByLastVisitedDate = extensions.sortByLastVisitedDate;
                }
              });

              return r.dataRecords;
            });
          })
          .then(function(results) {
            _currentQuery = {};
            return results;
          })
          .catch(function(err) {
            _currentQuery = {};
            throw err;
          });
      };
    }
  );
}());
