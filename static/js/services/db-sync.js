var _ = require('underscore'),
    ALL_KEY = [ '_all' ], // key in the doc_by_place view for records everyone can access
    UNASSIGNED_KEY = [ '_unassigned' ]; // key in the doc_by_place view for unassigned records

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
    return _.findWhere(errors, { status: 401 });
  };

  inboxServices.factory('DBSync',
    function(
      $log,
      $q,
      Auth,
      DB,
      Session,
      Settings,
      UserDistrict
    ) {

      'ngInject';

      var getViewKeys = function() {
        var keys = [ ALL_KEY ];
        return UserDistrict()
          .then(function(facilityId) {
            if (facilityId) {
              keys.push([ facilityId ]);
            }
          })
          .then(Settings)
          .then(function(settings) {
            if (settings.district_admins_access_unallocated_messages) {
              return Auth('can_view_unallocated_data_records')
                .then(function() {
                  keys.push(UNASSIGNED_KEY);
                })
                .catch(function() {
                  // can't view unallocated - swallow and continue
                });
            }
          })
          .then(function() {
            return keys;
          })
          .catch(function(err) {
            // allow some replication otherwise the user can get stuck
            // unable to fix their own configuration
            $log.error('Error fetching sync options - using with minimum options', err);
            return [ ALL_KEY ];
          });
      };

      var getOptions = function(direction, options) {
        options = options || {};
        _.defaults(options, {
          live: true,
          retry: true,
          timeout: false,
          heartbeat: 10000,
          back_off_function: backOffFunction
        });
        if (direction === 'to') {
          return $q.resolve(options);
        }
        return getViewKeys()
          .then(function(keys) {
            return DB().query('medic/doc_by_place', { keys: keys });
          })
          .then(function(viewResult) {
            var userCtx = Session.userCtx();
            var ids = _.pluck(viewResult.rows, 'id');
            ids.push('org.couchdb.user:' + userCtx && userCtx.name);
            return ids;
          })
          .then(function(ids) {
            options.doc_ids = ids;
            return options;
          });
      };

      var replicate = function(direction, successCallback, options) {
        return getOptions(direction, options)
          .then(function(options) {
            var remote = DB({ remote: true });
            return DB().replicate[direction](remote, options)
              .on('denied', function(err) {
                // In theory this could be caused by 401s
                // TODO: work out what `err` looks like and navigate to login
                // when we detect it's a 401
                $log.error('Denied replicating ' + direction + ' remote server', err);
              })
              .on('error', function(err) {
                $log.error('Error replicating ' + direction + ' remote server', err);
              })
              .on('paused', function(err) {
                if (!err && successCallback) {
                  successCallback({ direction: direction });
                }
              })
              .on('complete', function (info) {
                if (!info.ok && authenticationIssue(info.errors)) {
                  Session.navigateToLogin();
                }
              });
          })
          .catch(function(err) {
            $log.error('Error getting sync options', err);
          });

      };

      return function(successCallback) {
        if (Session.isAdmin()) {
          if (successCallback) {
            successCallback({ disabled: true });
          }
          return;
        }
        replicate('from', successCallback);
        replicate('to', successCallback, {
          filter: function(doc) {
            // don't try to replicate ddoc back to the server
            return doc._id !== '_design/medic';
          }
        });
      };
    }
  );

}());
