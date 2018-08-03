var _ = require('underscore'),
    Search = require('search'),
    calendarInterval = require('../modules/calendar-interval');

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
      SearchFactory
    ) {

      'ngInject';

      var _currentQuery = {};

      // Silently cancel repeated queries.
      var debounce = function(type, filters, options) {
        if (type === _currentQuery.type &&
            filters === _currentQuery.filters &&
            _.isEqual(options, _currentQuery.options)) {
          return true;
        }
        _currentQuery.type = type;
        _currentQuery.filters = filters;
        _currentQuery.options = options;
        return false;
      };

      var _search = SearchFactory();

      var getLastVisitedDates = function(searchResults, settings) {
        settings = settings || {};

        return DB().query('medic-client/contacts_by_last_visited', {
          reduce: false,
          keys: searchResults
        }).then(function(results) {
          var visitStats = {},
              interval = calendarInterval.getCurrent(settings.monthStartDate);

          results.rows.forEach(function(row) {
            var stats = visitStats[row.key] || { lastVisitedDate: -1, visitCount: 0 };

            if (stats.lastVisitedDate < row.value) {
              stats.lastVisitedDate = row.value;
            }

            if (row.value >= interval.start && row.value <= interval.end) {
              stats.visitCount++;
            }

            visitStats[row.key] = stats;
          });

          return Object.keys(visitStats).map(function(key) {
            return {
              key: key,
              value: {
                lastVisitedDate: visitStats[key].lastVisitedDate,
                visitCount: visitStats[key].visitCount,
                visitCountGoal: settings.visitCountGoal
              }
            };
          });
        });
      };

      return function(type, filters, options, extensions) {
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
            var dataRecordsPromise = GetDataRecords(searchResults, options);

            var result;
            if (extensions.displayLastVisitedDate) {
              var lastVisitedDatePromise = getLastVisitedDates(searchResults, extensions.lastVisitedDateSettings);

              result = $q
                .all([ dataRecordsPromise, lastVisitedDatePromise ])
                .then(function(results) {
                  var dataRecords = results[0];
                  var lastVisitedDates = results[1];

                  lastVisitedDates.forEach(function(dateResult) {
                    var relevantDataRecord = dataRecords.find(function(dataRecord) {
                      return dataRecord._id === dateResult.key;
                    });

                    if (relevantDataRecord) {
                      _.extend(relevantDataRecord, dateResult.value);
                      relevantDataRecord.sortByLastVisitedDate = extensions.sortByLastVisitedDate;
                    }
                  });

                  return dataRecords;
                });
            } else {
              result = dataRecordsPromise;
            }

            return result;
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
