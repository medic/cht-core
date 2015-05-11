var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('ActiveRequests', [
    function() {
      var pending = [];
      return {
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

      var wrap = function(args, fn) {
        args[args.length - 1] = args[args.length - 1] || {};
        if (args[args.length - 1].timeout === false) {
          return fn.apply(this, args);
        }
        var canceller = $q.defer();
        ActiveRequests.add({ url: args[0], canceller: canceller });
        args[args.length - 1].timeout = canceller.promise;
        var promise = fn.apply(this, args);
        promise.finally(function() {
          ActiveRequests.remove(args[0]);
        });
        return promise;
      };

      /**
       * To disable the cancel on navigation feature, set 'timeout' to false
       * in the options param.
       */
      return {
        get: function(url, options) {
          return wrap([ url, options ], $http.get);
        },
        put: function(url, data, options) {
          return wrap([ url, data, options ], $http.put);
        },
        head: function(url, options) {
          return wrap([ url, options ], $http.head);
        }
      };

    }
  ]);

}());