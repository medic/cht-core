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

  inboxServices.factory('DB', [
    'pouchDB', 'UserDistrict',
    function(pouchDB, UserDistrict) {

      // TODO work out how to go direct to remote for unrestricted users
      // TODO handle nagivation when indexeddb transation not complete
      // TODO lock down api so non-admins can only replicate
      // TODO for users replication, only replicate logged in user?
      // TODO replication doesn't work with non-admin basic auth?!

      var replicate = function(from, options) {
        options = options || {};
        _.defaults(options, {
          live: true,
          retry: true,
          back_off_function: backOffFunction
        });
        var direction = from ? 'from' : 'to';
        var fn = pouchDB('medic').replicate[direction];
        return fn('http://gareth:pass@localhost:5988/medic', options)
          .on('error', function(err) {
            console.log('Error replicating ' + direction + ' remote server', err);
          });
      };

      return {
        sync: function() {

          var medic = pouchDB('medic');

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

          // TODO only admins can replicate _users! Find another way to get current user information
          // pouchDB('_users')
          //   .replicate.from('http://localhost:5988/_users', replicationOptions);
        }
      };
    }
  ]);

}());
