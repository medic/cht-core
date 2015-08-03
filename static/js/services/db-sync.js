var _ = require('underscore'),
    utils = require('kujua-utils'),
    async = require('async');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  var backOffFunction = function(prev) {
    if (prev <= 0) {
      // first run, backoff 1 second
      return 1000;
    }
    // double the backoff, maxing out at 1 minute
    return Math.min(prev * 2, 60000);
  };

  inboxServices.factory('DBSync', [
    'DB', 'UserDistrict', 'UserCtxService', 'Settings',
    function(DB, UserDistrict, UserCtxService, Settings) {

      var replicate = function(from, options) {
        options = options || {};
        _.defaults(options, {
          live: true,
          retry: true,
          back_off_function: backOffFunction
        });
        var direction = from ? 'from' : 'to';
        var fn = DB.get().replicate[direction];
        return fn(DB.getRemoteUrl(), options)
          .on('error', function(err) {
            console.log('Error replicating ' + direction + ' remote server', err);
          });
      };

      var getQueryParams = function(userCtx, callback) {
        async.parallel([ Settings, UserDistrict ], function(err, results) {
          if (err) {
            return callback(err);
          }
          var params = { id: results[1] };
          if (utils.isUserDistrictAdmin(userCtx) &&
              results[0].district_admins_access_unallocated_messages) {
            params.unassigned = true;
          }
          callback(null, params);
        });
      };

      return function() {
        var userCtx = UserCtxService();
        if (utils.isUserAdmin(userCtx)) {
          // admins have potentially too much data so bypass local pouch
          return;
        }
        replicate(false);
        getQueryParams(userCtx, function(err, params) {
          if (err) {
            return console.log('Error initializing DB sync', err);
          }
          replicate(true, {
            filter: 'medic/doc_by_place',
            query_params: params
          });
        });
      };
    }
  ]);

}());
