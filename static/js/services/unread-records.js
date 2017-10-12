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

  var getCount = function() {
    return $q.all([ getTotal(), getRead() ]).then(function(results) {
      var total = results[0];
      var read = results[1];
      var result = {};
      TYPES.forEach(function(type) {
        result[type] = getRowValueForType(total, type) - getRowValueForType(read, type);
      });
      return result;
    });
  };

  var updateReadDocs = function(change) {
    // update the meta db if a doc is deleted by a non-admin
    // admin dbs are updated by sentinel instead
    if (!change.deleted || Session.isAdmin()) {
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

  var changeHandler = function(change) {
    return updateReadDocs(change)
      .then(getCount);
  };

  return function(callback) {
    // wait for db.info to avoid uncaught exceptions: #3754
    DB().info().then(function() {
      getCount()
        .then(function(count) {
          callback(null, count);
        })
        .catch(callback);
      Changes({
        key: 'read-status',
        filter: function(change) {
          return change.doc.type === 'data_record';
        },
        callback: function(change) {
          changeHandler(change)
            .then(function(count) {
              callback(null, count);
            })
            .catch(callback);
        }
      });
    });
  };
});
