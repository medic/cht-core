(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var getMultiplier = function(key, user) {
    if (key === '_total') {
      return 1;
    }
    if (key === user) {
      return -1;
    }
  };

  var calculateStatus = function(res, options) {
    var status = { forms: 0, messages: 0 };
    res.rows.forEach(function(row) {
      var name = row.key[0];
      var type = row.key[1];
      var dist = row.key[2];

      if (!options.district || options.district === dist) {
        var multiplier = getMultiplier(name, options.user);
        if (multiplier) {
          status[type] += (row.value * multiplier);
        }
      }
    });
    return status;
  };

  inboxServices.factory('ReadMessages', [
    'HttpWrapper', 'BaseUrlService',
    function(HttpWrapper, BaseUrlService) {
      return function(options, callback) {
        var getOptions = {
          params: { group: true },
          targetScope: 'root'
        };
        HttpWrapper
          .get(BaseUrlService() + '/read_records', getOptions)
          .success(function(res) {
            callback(null, calculateStatus(res, options));
          })
          .error(function(data) {
            console.log('err', arguments);
            callback(new Error(data));
          });
      };
    }
  ]);


}());