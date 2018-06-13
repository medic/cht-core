var _ = require('underscore'),
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

      var getLastVisitedDates = function(searchResults) {
        return DB().query('medic-client/contacts_by_last_visited', {
          reduce: true,
          group: true,
          keys: searchResults
        }).then(function(results) {
          return results.rows;
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

        // Gareth: I have maintained the original debouncing code, but I'm
        // not sure it actually does anything useful? Shouldn't it attach to an
        // ongoing result (promise) and not just return []?
        if (!options.force && debounce(type, filters, options)) {
          return $q.resolve([]);
        }

        return _search(type, filters, options, extensions)
          .then(function(searchResults) {
            var dataRecordsPromise = GetDataRecords(searchResults, options);

            var result;
            if (extensions.displayLastVisitedDate) {
              var lastVisitedDatePromise = getLastVisitedDates(searchResults);

              result = $q.all({
                dataRecords: dataRecordsPromise,
                lastVisitedDates: lastVisitedDatePromise
              }).then(function(r) {
                r.lastVisitedDates.forEach(function(dateResult) {
                  var relevantDataRecord = r.dataRecords.find(function(dataRecord) {
                    return dataRecord._id === dateResult.key;
                  });

                  if (relevantDataRecord) {
                    relevantDataRecord.lastVisitedDate = dateResult.value.max;
                    relevantDataRecord.sortByLastVisitedDate = extensions.sortByLastVisitedDate;
                  }
                });

                return r.dataRecords;
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
