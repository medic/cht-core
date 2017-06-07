angular.module('inboxServices').factory('ReadMessages', function(
  DB,
  Session
) {

  'use strict';
  'ngInject';

  var getMultiplier = function(key, user) {
    if (key === '_total') {
      return 1;
    }
    if (key === user) {
      return -1;
    }
  };

  var calculateStatus = function(res) {
    var user = Session.userCtx().name;
    var status = { forms: 0, messages: 0 };
    res.rows.forEach(function(row) {
      var name = row.key[0];
      var type = row.key[1];
      var multiplier = getMultiplier(name, user);
      if (multiplier) {
        status[type] += (row.value * multiplier);
      }
    });
    return status;
  };

  return function() {
    return DB()
      .query('medic-client/data_records_read_by_type', { group: true })
      .then(calculateStatus);
  };
});
