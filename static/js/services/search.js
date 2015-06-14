var _ = require('underscore'),
    async = require('async');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('Search', ['DbGet', 'DbView', 'HttpWrapper', 'FormatDataRecord', 'GenerateSearchRequests',
    function(DbGet, DbView, HttpWrapper, FormatDataRecord, GenerateSearchRequests) {

      var _currentQuery;

      var debounce = function(requests) {
        var queryString = JSON.stringify(requests);
        if (queryString === _currentQuery) {
          // debounce as same query already running
          return true;
        }
        _currentQuery = queryString;
        return false;
      };

      var getUnfilteredReports = function(options, callback) {
        var requestOptions = {
          targetScope: options.type,
          params: {
            include_docs: true,
            descending: true,
            limit: options.limit,
            skip: options.skip
          }
        };
        DbView('reports_by_date', requestOptions, callback);
      };

      var getPage = function(rows, options) {
        var end = rows.length - options.skip;
        var start = end - options.limit;
        return _.pluck(_.sortBy(rows, 'value').slice(start, end), 'id');
      };

      var getResponseIntersection = function(responses) {
        var intersection = responses.pop().rows;
        intersection = _.uniq(intersection, 'id');
        _.each(responses, function(response) {
          intersection = _.reject(intersection, function(row) {
            return !_.findWhere(response.rows, { id: row.id });
          });
        });
        return intersection;
      };

      var getRequest = function(request, options, callback) {
        DbView(
          request.view,
          { targetScope: options.type, params: request.params },
          callback
        );
      };

      var getFilteredReports = function(requests, options, callback) {
        async.map(requests, _.partial(getRequest, _, options), function(err, responses) {
          if (err) {
            return callback(err);
          }
          var intersection = getResponseIntersection(responses, options);
          var page = getPage(intersection, options);
          if (!page.length) {
            callback(null, []);
          }
          DbGet(page, { targetScope: options.type }, callback);
        });
      };

      var getReports = function(requests, options, callback) {
        if (requests.length) {
          getFilteredReports(requests, options, callback);
        } else {
          getUnfilteredReports(options, callback);
        }
      };

      var generateRequests = function($scope, callback) {
        var requests;
        try {
          requests = GenerateSearchRequests($scope);
        } catch(e) {
          return callback(e);
        }
        if (debounce(requests)) {
          return;
        }
        callback(null, requests);
      };

      return function($scope, options, callback) {
        _.defaults(options, {
          limit: 50,
          skip: 0,
          type: $scope.filterModel.type
        });
        if (options.type === 'reports') {
          generateRequests($scope, function(err, requests) {
            if (err) {
              return callback(err);
            }
            getReports(requests, options, function(err, results) {
              _currentQuery = null;
              if (err) {
                return callback(err);
              }
              FormatDataRecord(results, callback);
            });
          });
        } else {
          console.log('TODO: not yet supported');
        }
      };
    }
  ]);

}());