var _ = require('underscore'),
    TYPES = [ 'report', 'message' ];

angular.module('inboxServices').factory('CountUnreadRecords', function(
  $q,
  DB
) {

  'use strict';
  'ngInject';

  var getTotal = function() {
    return DB().query('medic-client/data_records_by_type', { group: true });
  };

  var getRead = function() {
    return DB({ meta: true }).query('medic-user/read', { group: true });
  };

  var getValue = function(response, type) {
    var result = _.findWhere(response.rows, { key: type });
    return (result && result.value) || 0;
  };

  return function() {
    return $q.all([ getTotal(), getRead() ]).then(function(results) {
      var total = results[0];
      var read = results[1];
      var result = {};
      TYPES.forEach(function(type) {
        result[type] = getValue(total, type) - getValue(read, type);
      });
      return result;
    });
  };
});
