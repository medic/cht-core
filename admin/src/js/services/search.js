const _ = require('lodash'); // don't use eslint/core -- TODO link to issue
const Search = require('@medic/search');

(function () {

  'use strict';

  // To make it easier to mock out
  angular.module('inboxServices').factory('SearchFactory',
    function(
      $q,
      DB
    ) {

      'ngInject';

      return function() {
        return Search($q, DB());
      };
    });

  angular.module('inboxServices').factory('Search',
    function(
      $log,
      $q,
      GetDataRecords,
      SearchFactory
    ) {

      'ngInject';

      let _currentQuery = {};

      // Silently cancel repeated queries.
      const debounce = function(type, filters, options) {
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

      const _search = SearchFactory();

      return function(type, filters, options) {
        $log.debug('Doing Search', type, filters, options);

        options = options || {};
        _.defaults(options, {
          limit: 50,
          skip: 0
        });

        if (!options.force && debounce(type, filters, options)) {
          return $q.resolve([]);
        }
        return _search(type, filters, options)
          .then(function(searchResults) {
            return GetDataRecords(searchResults.docIds, options);
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
    });
}());
