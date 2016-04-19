var _ = require('underscore'),
    async = require('async');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('Search', ['DB', 'DbView', 'GenerateSearchRequests',
    function(DB, DbView, GenerateSearchRequests) {

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

      var view = function(request, callback) {
        DbView(request.view, { params: request.params })
          .then(function(data) {
            callback(null, data.results);
          })
          .catch(callback);
      };

      var filter = function(type, requests, options, callback) {
        async.map(requests, view, function(err, responses) {
          if (err) {
            return callback(err);
          }
          var intersection = getIntersection(responses);
          var page = getPage(type, intersection, options);
          if (!page.length) {
            return callback(null, []);
          }
          DB.get()
            .allDocs({ include_docs: true, keys: page })
            .then(function(response) {
              callback(null, _.pluck(response.rows, 'doc'));
            })
            .catch(function(err) {
              callback(err);
            });
        });
      };

      var execute = function(type, requests, options, callback) {
        if (requests.length === 1 && requests[0].params.include_docs) {
          // filter not required - just get the view directly
          _.defaults(requests[0].params, {
            limit: options.limit,
            skip: options.skip
          });
          view(requests[0], callback);
        } else {
          // filtering
          filter(type, requests, options, callback);
        }
      };

      var generateRequests = function(type, filters, options, callback) {
        var requests;
        try {
          requests = GenerateSearchRequests(type, filters);
        } catch(e) {
          return callback(e);
        }
        if (!options.force && debounce(type, filters, requests)) {
          return;
        }
        callback(null, requests);
      };

      return function(type, filters, options, callback) {
        _.defaults(options, {
          limit: 50,
          skip: 0
        });
        generateRequests(type, filters, options, function(err, requests) {
          if (err) {
            return callback(err);
          }
          execute(type, requests, options, function(err, results) {
            _currentQuery = {};
            callback(err, results);
          });
        });
      };
    }
  ]);

}());
