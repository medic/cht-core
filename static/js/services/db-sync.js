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
    'DB', 'UserDistrict', 'Session',
    function(DB, UserDistrict, Session) {

      var replicate = function(from, options) {
        options = options || {};
        _.defaults(options, {
          live: true,
          retry: true,
          back_off_function: backOffFunction
        });
        var direction = from ? 'from' : 'to';
        var fn = DB.get().replicate[direction];
        return fn(DB.getRemoteUrl(), options)
          .on('error', function(err) {
            console.log('Error replicating ' + direction + ' remote server', err);
          });
      };

      return function() {
        if (utils.isUserAdmin(Session.userCtx())) {
          // admins have potentially too much data so bypass local pouch
          return;
        }
        UserDistrict(function(err, district) {
          if (err) {
            return console.log('Error fetching district', err);
          }

          replicate(true, {
            filter: 'medic/doc_by_place',
            query_params: {
              id: district,
              unassigned: false // TODO get from user
            }
          });
        });
        replicate(false);
      };
    }
  ]);

}());
