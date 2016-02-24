var _ = require('underscore'),
    utils = require('kujua-utils');

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

  var authenticationIssue = function(errors) {
    return _.find(errors, function(error) { return error.status === 401;});
  };

  inboxServices.factory('DBSync', [
    '$log', 'DB', 'UserDistrict', 'Session', 'Settings', '$q',
    function($log, DB, UserDistrict, Session, Settings, $q) {

      var replicate = function(direction, options) {
        options = options || {};
        _.defaults(options, {
          live: true,
          retry: true,
          timeout: false,
          back_off_function: backOffFunction
        });
        var fn = DB.get().replicate[direction];
        return fn(DB.getRemoteUrl(), options)
          .on('denied', function(err) {
            $log.error('Denied replicating ' + direction + ' remote server', err);
          })
          .on('error', function(err) {
            $log.error('Error replicating ' + direction + ' remote server', err);
          })
          .on('complete', function (info) {
            if (!info.ok && authenticationIssue(info.errors)) {
              $log.warn('User must reauthenticate');
              Session.navigateToLogin();
            } else {
              $log.error('Replication completed which should never happen', info);
            }
          });
      };

      var getUserDistrict = function() {
        var deferred = $q.defer();
        UserDistrict(function(err, district) {
          if (err) {
            deferred.reject(err);
            return;
          }
          deferred.resolve(district);
        });
        return deferred.promise;
      };

      var getQueryParams = function(userCtx) {
        return $q.all([Settings(), getUserDistrict()])
          .then(function(values) {
            var settings = values[0];
            var district = values[1];
            var params = { id: district };
            if (utils.hasPerm(userCtx, 'can_view_unallocated_data_records') &&
                settings.district_admins_access_unallocated_messages) {
              params.unassigned = true;
            }
            return params;
          });
      };

      return function() {
        var userCtx = Session.userCtx();
        if (utils.isUserAdmin(userCtx)) {
          // admins have potentially too much data so bypass local pouch
          $log.debug('You have administrative privileges; not replicating');
          return;
        }
        replicate('to', {
          filter: function(doc) {
            // don't try to replicate ddoc back to the server
            return doc._id !== '_design/medic';
          }
        });
        getQueryParams(userCtx)
          .then(function(params) {
            replicate('from', {
              filter: 'erlang_filters/doc_by_place',
              query_params: params
            });
          })
          .catch(function(err) {
            $log.error('Error initializing DB sync', err);
          });
      };
    }
  ]);

}());
