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

  inboxServices.factory('DBSync', [
    '$log', 'DB', 'UserDistrict', 'Session', 'Settings', '$q',
    function($log, DB, UserDistrict, Session, Settings, $q) {
      var lastSeqRemote = 0;
      var lastSeqLocal = 0;

      var toReplicationFilter = function(doc) {
          // don't try to replicate ddoc back to the server
          return doc._id !== '_design/medic';
        };

      var fromReplicationFilter = 'medic/doc_by_place';

      var replicate = function(from, options) {
        options = options || {};
        _.defaults(options, {
          live: true,
          retry: true,
          timeout: false,
          back_off_function: backOffFunction
        });
        var direction = from ? 'from' : 'to';
        var fn = DB.get().replicate[direction];
        var repl = fn(DB.getRemoteUrl(), options);
        repl.on('checkpoint', function(checkpoint) {
            if (from) {
              lastSeqRemote = checkpoint;
            } else {
              lastSeqLocal = checkpoint;
            }
          })
          .on('denied', function(err) {
            $log.error('Denied replicating ' + direction + ' remote server', err);
          })
          .on('change', function(event) {
            $log.debug('Replication change ' + direction + ' remote server', event);
          })
          .on('error', function(err) {
            $log.error('Error replicating ' + direction + ' remote server', err);
          });
      };

      // Remove this function when UserDistrict is refactored into promises.
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

      var getRemoteChanges = function(last_seq) {
        var userCtx = Session.userCtx();
        if (utils.isUserAdmin(userCtx)) {
          return $q.reject('No remote changes : admin doesn\t have local DB.');
        }
        return getQueryParams(userCtx)
          .then(function(params) {
            return DB.getRemote().changes(
              {since: last_seq,
               filter : fromReplicationFilter,
               query_params: params});
          });
      };

      var getLocalChanges = function(last_seq) {
        var userCtx = Session.userCtx();
        if (utils.isUserAdmin(userCtx)) {
          return $q.reject('No local changes : admin doesn\t have local DB.');
        }
        return DB.get().changes(
          {since: last_seq,
           filter : toReplicationFilter});
      };

      var isOnline = function() {
        return DB.getRemote().info()
          .then(function() {
            return true;
          })
          .catch (function() {
            return false;
          });
      };

      // changes.results format: [{seq: 123, id: id1, changes: [{rev: revId1}, {rev: revId2}]}]
      // revsDiff format: e.g. {docId1: [revId1, revId2], docId2: [revId3]}
      // return revdiffs format: e.g. {docId1 : {missing: [revId1, revId2]}, docId2: {missing: [revId3]}}
      var changesToDiff = function(changes) {
        var diff = {};
        changes.results.forEach(function (change) {
          diff[change.id] = change.changes.map(function (x) {
            return x.rev;
          });
        });
        return diff;
      };

      // Number of changes that are missing in the db, and need to be replicated in.
      var numNewChanges = function(db, changes) {
        return db.revsDiff(changes)
          .then(function (diffs) {
            if (db._db_name === 'http://localhost:5988/medic') {
              $log.debug('----', Object.keys(diffs).length, 'changes to send', diffs);
            } else {
              $log.debug('----', Object.keys(diffs).length, 'changes (or more) to fetch', diffs);
            }

            return Object.keys(diffs).length;
          });
      };

      var numChangesToFetch = function() {
        return numChanges(true);
      };

      var numChangesToSend = function() {
        return numChanges(false);
      };

      var numChanges = function(from) {
        var direction = from ? 'fetch' : 'send';
        var lastSeq = from ? lastSeqRemote : lastSeqLocal;
        var getChangesFunc = from ? getRemoteChanges : getLocalChanges;
        var receivingDb = from ? DB.get() : DB.getRemote();

        var userCtx = Session.userCtx();
        if (utils.isUserAdmin(userCtx)) {
          return $q.reject('No changes to ' + direction + ' : admin doesn\t have local DB.');
        }
        return isOnline()
          .then(function(online) {
            if (!online) {
              throw 'No changes to ' + direction + ' : offline.';
            }
            return getChangesFunc(lastSeq)
              .then(function(changes) {
                if (!changes.results || changes.results.length === 0) {
                  return 0;
                }
                return numNewChanges(receivingDb, changesToDiff(changes));
              });
          });
      };

      var sync = function() {
        var userCtx = Session.userCtx();
        if (utils.isUserAdmin(userCtx)) {
          // admins have potentially too much data so bypass local pouch
          $log.debug('You have administrative privileges; not replicating');
          return;
        }
        // Replicate to server
        replicate(false, {
          filter: toReplicationFilter
        });
        getQueryParams(userCtx)
          .then(function(params) {
            // Replicate from server
            replicate(true, {
              batch_size: 1,
              filter: fromReplicationFilter,
              query_params: params
            });
          })
          .catch(function(err) {
            $log.error('Error initializing DB sync', err);
          });
      };

      return {
        sync: sync,
        isOnline: isOnline,
        numChangesToSend: numChangesToSend,
        numChangesToFetch: numChangesToFetch
      };
    }
  ]);

}());
