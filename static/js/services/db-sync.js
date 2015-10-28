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
    '$log', 'DB', 'UserDistrict', 'Session', 'Settings',
    function($log, DB, UserDistrict, Session, Settings) {

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
          .on('denied', function(err) {
            $log.error('Denied replicating ' + direction + ' remote server', err);
          })
          .on('error', function(err) {
            $log.error('Error replicating ' + direction + ' remote server', err);
          });
      };

      var getQueryParams = function(userCtx, callback) {
        async.parallel([ Settings, UserDistrict ], function(err, results) {
          if (err) {
            return callback(err);
          }
          var params = { id: results[1] };
          if (utils.hasPerm(userCtx, 'can_view_unallocated_data_records') &&
              results[0].district_admins_access_unallocated_messages) {
            params.unassigned = true;
          }
          callback(null, params);
        });
      };

      return function() {
        var userCtx = Session.userCtx();
        if (utils.isUserAdmin(userCtx)) {
          // admins have potentially too much data so bypass local pouch
          $log.debug("You have administrative privileges; not replicating");
          return;
        }
        replicate(false, {
          filter: function(doc) {
            // don't try to replicate ddoc back to the server
            return doc._id !== '_design/medic';
          }
        });
        getQueryParams(userCtx, function(err, params) {
          if (err) {
            return $log.error('Error initializing DB sync', err);
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
