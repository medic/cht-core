var _ = require('underscore'),
    READ_ONLY_TYPES = [ 'form', 'translations' ],
    READ_ONLY_IDS = [ 'resources', 'appcache', 'zscore-charts' ],
    DDOC_PREFIX = [ '_design/' ],
    META_SYNC_FREQUENCY = 30 * 60 * 1000; // 30 minutes

angular.module('inboxServices').factory('DBSync',
  function(
    $interval,
    $log,
    $q,
    Auth,
    DB,
    Session
  ) {

    'use strict';
    'ngInject';

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
      return DB().allDocs().then(function(result) {
        options.doc_ids = _.pluck(result.rows, 'id');
        return options;
      });
    };

    var replicate = function(direction, updateListener, options) {
      return getOptions(direction, options)
        .then(function(options) {
          var remote = DB({ remote: true });
          return DB().replicate[direction](remote, options)
            .on('active', function() {
              if (updateListener) {
                updateListener({ direction: direction, status: 'in_progress' });
              }
            })
            .on('denied', function(err) {
              // In theory this could be caused by 401s
              // TODO: work out what `err` looks like and navigate to login
              // when we detect it's a 401
              $log.error('Denied replicating ' + direction + ' remote server', err);
            })
            .on('error', function(err) {
              $log.error('Error replicating ' + direction + ' remote server', err);
              if (updateListener) {
                updateListener({ direction: direction, status: 'required' });
              }
            })
            .on('paused', function(err) {
              if (updateListener) {
                var status = err ? 'required' : 'not_required';
                updateListener({ direction: direction, status: status });
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

    var replicateTo = function(updateListener) {
      return Auth('can_edit')
        .then(function() {
          return replicate('to', updateListener, {
            filter: function(doc) {
              // don't try to replicate read only docs back to the server
              return READ_ONLY_TYPES.indexOf(doc.type) === -1 &&
                     READ_ONLY_IDS.indexOf(doc._id) === -1 &&
                     doc._id.indexOf(DDOC_PREFIX) !== 0;
            }
          });
        })
        .catch(function() {
          // not authorized to replicate to server - that's ok
          return;
        });
    };

    var replicateFrom = function(updateListener) {
      return replicate('from', updateListener);
    };

    var syncMeta = function() {
      var remote = DB({ meta: true, remote: true });
      var local = DB({ meta: true });
      local.sync(remote);
    };

    return function(updateListener) {
      if (Session.isAdmin()) {
        if (updateListener) {
          updateListener({ disabled: true });
        }
        return $q.resolve();
      }

      syncMeta();
      $interval(syncMeta, META_SYNC_FREQUENCY);

      return $q.all([
        replicateFrom(updateListener),
        replicateTo(updateListener)
      ]);
    };
  }
);
