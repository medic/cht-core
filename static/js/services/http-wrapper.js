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
        cancel: function(event, toState) {
          var stillPending = [];
          _.each(pending, function(p) {
            if (toState.name.indexOf(p.targetScope) === 0) {
              stillPending.push(p);
            } else {
              p.canceller.resolve();
            }
          });
          pending = stillPending;
        }
      };
    }
  ]);

  inboxServices.factory('HttpWrapper', [
    '$http', '$q', 'ActiveRequests',
    function($http, $q, ActiveRequests) {

      var wrap = function(args, fn) {
        var options = args[args.length - 1] = args[args.length - 1] || {};
        if (options.targetScope === 'root') {
          return fn.apply(this, args);
        }
        var canceller = $q.defer();
        ActiveRequests.add({
          url: args[0],
          canceller: canceller,
          targetScope: options.targetScope
        });
        options.timeout = canceller.promise;
        var promise = fn.apply(this, args);
        promise.finally(function() {
          ActiveRequests.remove(args[0]);
        });
        return promise;
      };

      /**
       * To disable the cancel on navigation feature, set 'targetScope' to 'root'
       * in the options param.
       */
      return {
        get: function(url, options) {
          return wrap([ url, options ], $http.get);
        },
        post: function(url, data, options) {
          return wrap([ url, data, options ], $http.post);
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
