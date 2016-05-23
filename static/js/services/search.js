var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('Search',
    function(
      $q,
      DB,
      DbView,
      GenerateSearchRequests
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
          .then(function(responses) {
            var intersection = getIntersection(responses);
            var page = getPage(type, intersection, options);
            if (!page.length) {
              return [];
            }
            return DB.get()
              .allDocs({ include_docs: true, keys: page })
              .then(function(response) {
                return $q.resolve(_.pluck(response.rows, 'doc'));
              });
          });
      };

      var execute = function(type, requests, options) {
        if (requests.length === 1 && requests[0].params.include_docs) {
          // filter not required - just get the view directly
          _.defaults(requests[0].params, {
            limit: options.limit,
            skip: options.skip
          });
          return view(requests[0]);
        }
        // filtering
        return filter(type, requests, options);
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
            return execute(type, requests, options);
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
