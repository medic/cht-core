var _ = require('underscore');

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
      Session
    ) {

      'ngInject';

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
