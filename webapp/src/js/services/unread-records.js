const _ = require('lodash/core');
const readDocs = require('../modules/read-docs');
const TYPES = [ 'report', 'message' ];

angular.module('inboxServices').factory('UnreadRecords', function(
  $q,
  Changes,
  DB,
  Session
) {

  'use strict';
  'ngInject';

  const getTotal = function() {
    return DB().query('medic-client/data_records_by_type', { group: true });
  };

  const getRead = function() {
    return DB({ meta: true }).query('medic-user/read', { group: true });
  };

  const getRowValueForType = function(response, type) {
    const result = _.find(response.rows, { key: type });
    return (result && result.value) || 0;
  };

  const getCount = function(callback) {
    return $q.all([ getTotal(), getRead() ])
      .then(function(results) {
        const total = results[0];
        const read = results[1];
        const result = {};
        TYPES.forEach(function(type) {
          result[type] = getRowValueForType(total, type) - getRowValueForType(read, type);
        });
        callback(null, result);
      })
      .catch(callback);
  };

  const updateReadDocs = function(change) {
    // update the meta db if a doc is deleted by a non-admin
    // admin dbs are updated by sentinel instead
    if (!change.deleted || Session.isOnlineOnly()) {
      return $q.resolve();
    }
    const metaDb = DB({ meta: true });
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

  const changeHandler = function(change, callback) {
    return updateReadDocs(change)
      .then(function() {
        getCount(callback);
      });
  };

  const service = (callback) => {
    // wait for db.info to avoid uncaught exceptions: #3754
    DB().info().then(function() {

      // get the initial count
      getCount(callback);

      // listen for changes in the medic db and update the count
      Changes({
        key: 'read-status-medic',
        filter: function(change) {
          return change.doc && change.doc.type === 'data_record';
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

    service.count = () => getCount(callback);
  };

  return service;
});
