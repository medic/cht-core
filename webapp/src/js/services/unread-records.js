var _ = require('underscore'),
    readDocs = require('../modules/read-docs'),
    TYPES = [ 'report', 'message' ];

angular.module('inboxServices').factory('UnreadRecords', function(
  $q,
  Changes,
  DB,
  Session
) {

  'use strict';
  'ngInject';

  var getTotal = function() {
    return DB().query('medic-client/data_records_by_type', { group: true });
  };

  var getRead = function() {
    return DB({ meta: true }).query('medic-user/read', { group: true });
  };

  var getRowValueForType = function(response, type) {
    var result = _.findWhere(response.rows, { key: type });
    return (result && result.value) || 0;
  };

  var getCount = function(callback) {
    return $q.all([ getTotal(), getRead() ])
      .then(function(results) {
        var total = results[0];
        var read = results[1];
        var result = {};
        TYPES.forEach(function(type) {
          result[type] = getRowValueForType(total, type) - getRowValueForType(read, type);
        });
        callback(null, result);
      })
      .catch(callback);
  };

  var updateReadDocs = function(change) {
    // update the meta db if a doc is deleted by a non-admin
    // admin dbs are updated by sentinel instead
    if (!change.deleted || Session.isOnlineOnly()) {
      return $q.resolve();
    }
    var metaDb = DB({ meta: true });
    return metaDb
      .get(readDocs.id(change.doc))
      .then(function(doc) {
        doc._deleted = true;
        return metaDb.put(doc);
      })
      .catch(function(err) {
        if (err.status !== 404) {
          // the doc hasn't been read yet
          throw err;
        }
      });
  };

  var changeHandler = function(change, callback) {
    return updateReadDocs(change)
      .then(function() {
        getCount(callback);
      });
  };

  return function(callback) {

    // wait for db.info to avoid uncaught exceptions: #3754
    DB().info().then(function() {

      // get the initial count
      getCount(callback);

      // listen for changes in the medic db and update the count
      Changes({
        key: 'read-status-medic',
        filter: function(change) {
          return change.doc.type === 'data_record';
        },
        callback: function(change) {
          changeHandler(change, callback);
        }
      });

      // listen for changes in the meta db and update the count
      Changes({
        metaDb: true,
        key: 'read-status-meta',
        callback: function() {
          getCount(callback);
        }
      });
    });
  };

});
