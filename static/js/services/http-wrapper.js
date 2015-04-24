var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('ActiveRequests', [
    function() {
      var pending = [];
      return {
        get: function() {
          return pending;
        },
        add: function(request) {
          pending.push(request);
        },
        remove: function(url) {
          pending = _.filter(pending, function(p) {
            return p.url !== url;
          });
        },
        cancelAll: function() {
          _.each(pending, function(p) {
            p.canceller.resolve();
          });
          pending.length = 0;
        }
      };
    }
  ]);

  inboxServices.factory('HttpWrapper', [
    '$http', '$q', 'ActiveRequests',
    function($http, $q, ActiveRequests) {

      var wrap = function(url, options, requestFactory) {
        if (options.timeout === false) {
          return requestFactory();
        }
        var canceller = $q.defer();
        ActiveRequests.add({ url: url, canceller: canceller });
        var promise = requestFactory(canceller.promise);
        promise.finally(function() {
          ActiveRequests.remove(url);
        });
        return promise;
      };

      return {
        get: function(url, options) {
          options = options || {};
          return wrap(url, options, function(canceller) {
            options.timeout = canceller;
            return $http.get(url, options);
          });
        },
        put: function(url, data, options) {
          options = options || {};
          return wrap(url, options, function(canceller) {
            options.timeout = canceller;
            return $http.put(url, data, options);
          });
        },
        head: function(url, options) {
          options = options || {};
          return wrap(url, options, function(canceller) {
            options.timeout = canceller;
            return $http.head(url, options);
          });
        }
      };

    }
  ]);

}());