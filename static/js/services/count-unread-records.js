angular.module('inboxServices').factory('CountUnreadRecords', function(
  $q,
  DB
) {

  'use strict';
  'ngInject';

  var TYPES = [ 'report', 'message' ];

  var getTotals = function() {
    return DB()
      .query('medic-client/data_records_by_type', { group: true })
      .then(function(response) {
        var result = {};
        response.rows.forEach(function(row) {
          result[row.key] = row.value;
        });
        return result;
      });
  };

  var getRead = function(type) {
    var key = 'read:' + type + ':';
    return DB({ meta: true })
      .allDocs({ startkey: key, endkey: key + '\uFFFF' })
      .then(function(response) {
        return response.rows.length;
      });
  };

  return function() {
    var promises = TYPES.map(getRead);
    promises.unshift(getTotals());
    return $q.all(promises).then(function(results) {
      var result = {};
      var totals = results.shift();
      TYPES.forEach(function(type) {
        var read = results.shift();
        var total = totals[type] || 0;
        result[type] = total - read;
      });
      return result;
    });
  };
});
