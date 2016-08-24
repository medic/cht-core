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

      var getUnassignedKeys = function(settings) {
        if (settings.district_admins_access_unallocated_messages) {
          return Auth('can_view_unallocated_data_records')
            .then(function() {
              return [ UNASSIGNED_KEY ];
            })
            .catch(function() {
              // can't view unallocated - swallow and continue
              return [];
            });
        }
        return [];
      };

      var getFacilityKeys = function(settings, userCtx, facilityId) {
        if (!facilityId) {
          // no confugured facility
          return [];
        }
        if (!userCtx.roles || !userCtx.roles.length) {
          // not logged in or no configured role
          return [];
        }
        var depth = -1;
        if (settings.replication_depth) {
          userCtx.roles.forEach(function(role) {
            // find the role with the deepest depth
            var setting = _.findWhere(settings.replication_depth, { role: role });
            if (setting && setting.depth > depth) {
              depth = setting.depth;
            }
          });
        }
        if (depth === -1) {
          // no configured depth limit
          return [[ facilityId ]];
        }
        var keys = [];
        for (var i = 0; i <= depth; i++) {
          keys.push([ facilityId, i ]);
        }
        return keys;
      };

      var getBaseKeys = function() {
        return [ ALL_KEY ];
      };

      var getViewKeys = function(userCtx) {
        return $q.all([ Settings(), UserDistrict() ])
          .then(function(results) {
            var settings = results[0];
            var facilityId = results[1];
            return $q.all([
              getBaseKeys(),
              getUnassignedKeys(settings),
              getFacilityKeys(settings, userCtx, facilityId)
            ])
              .then(function(keys) {
                return keys[0].concat(keys[1], keys[2]);
              });
          })
          .catch(function(err) {
            // allow some replication otherwise the user can get stuck
            // unable to fix their own configuration
            $log.error('Error fetching sync options - using with minimum options', err);
            return getBaseKeys();
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
        var userCtx = Session.userCtx();
        return getViewKeys(userCtx)
          .then(function(keys) {
            return DB().query('medic/doc_by_place', { keys: keys });
          })
          .then(function(viewResult) {
            options.doc_ids = _.pluck(viewResult.rows, 'id');
            if (userCtx && userCtx.name) {
              options.doc_ids.push('org.couchdb.user:' + userCtx.name);
            }
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

      var replicateTo = function(successCallback) {
        return Auth('can_edit')
          .then(function() {
            return replicate('to', successCallback, {
              filter: function(doc) {
                // don't try to replicate ddoc back to the server
                return doc._id !== '_design/medic';
              }
            });
          })
          .catch(function() {
            // not authorized to replicate to server - that's ok
            return;
          });
      };

      var replicateFrom = function(successCallback) {
        return replicate('from', successCallback);
      };

      return function(successCallback) {
        if (Session.isAdmin()) {
          if (successCallback) {
            successCallback({ disabled: true });
          }
          return $q.resolve();
        }
        return $q.all([
          replicateFrom(successCallback),
          replicateTo(successCallback)
        ]);
      };
    }
  );

}());
