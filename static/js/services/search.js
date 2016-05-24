var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('Search',
    function(
      $q,
      DbView,
      GenerateSearchRequests,
      GetDataRecords
    ) {

      'ngInject';

      var _currentQuery = {};

      // Silently cancel repeated queries.  We decide if the query is repeated
      // by checking if its search string and scope are identical to the
      // previous query.
      var debounce = function(type, filters, requests) {
        var queryString = JSON.stringify(requests);
        if (type === _currentQuery.type &&
            filters === _currentQuery.filters &&
            queryString === _currentQuery.queryString) {
          return true;
        }
        _currentQuery.type = type;
        _currentQuery.filters = filters;
        _currentQuery.queryString = queryString;
        return false;
      };

      var getPage = function(type, rows, options) {
        var start;
        var end;
        if (type === 'reports') {
          // descending
          end = rows.length - options.skip;
          start = end - options.limit;
        } else {
          // ascending
          start = options.skip;
          end = start + options.limit;
        }
        return _.pluck(_.sortBy(rows, 'value').slice(start, end), 'id');
      };

      var getIntersection = function(responses) {
        var intersection = responses.pop().rows;
        intersection = _.uniq(intersection, 'id');
        _.each(responses, function(response) {
          intersection = _.reject(intersection, function(row) {
            return !_.findWhere(response.rows, { id: row.id });
          });
        });
        return intersection;
      };

      var view = function(request) {
        return DbView(request.view, { params: request.params })
          .then(function(data) {
            return data.results;
          });
      };

      var filter = function(type, requests, options) {
        return $q.all(requests.map(view))
          .then(getIntersection)
          .then(_.partial(getPage, type, _, options))
          .then(_.partial(GetDataRecords, _, options));
      };

      var generateRequests = function(type, filters, options) {
        var requests = GenerateSearchRequests(type, filters);
        if (!options.force && debounce(type, filters, requests)) {
          return [];
        }
        return requests;
      };

      return function(type, filters, options) {
        options = options || {};
        _.defaults(options, {
          limit: 50,
          skip: 0
        });
        return $q.resolve(generateRequests(type, filters, options))
          .then(function(requests) {
            return filter(type, requests, options);
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
