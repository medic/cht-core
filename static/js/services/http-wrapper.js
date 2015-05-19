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
        cancelExceptFor: function(allow) {
          var stillPending = [];
          _.each(pending, function(p) {
            if(_.contains(allow, p.updateTarget)) {
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

      var wrap = function(args, fn, updateTarget) {
        args[args.length - 1] = args[args.length - 1] || {};
        if (args[args.length - 1].timeout === false) {
          return fn.apply(this, args);
        }
        var canceller = $q.defer();
        ActiveRequests.add({ url: args[0], canceller: canceller, updateTarget: updateTarget });
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
          var updateTarget = options ? options.updateTarget : null;
          return wrap([ url, options ], $http.get, updateTarget);
        },
        put: function(url, data, options) {
          var updateTarget = options ? options.updateTarget : null;
          return wrap([ url, data, options ], $http.put, updateTarget);
        },
        head: function(url, options) {
          var updateTarget = options ? options.updateTarget : null;
          return wrap([ url, options ], $http.head, updateTarget);
        }
      };

    }
  ]);

}());
