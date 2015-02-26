(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('ReadMessagesRaw', ['$resource', 'BaseUrlService',
    function($resource, BaseUrlService) {
      return $resource(BaseUrlService() + '/read_records', {}, {
        query: {
          isArray: false,
          params: {
            group: true
          }
        }
      });
    }
  ]);

  inboxServices.factory('ReadMessages', ['$q', 'ReadMessagesRaw',
    function($q, ReadMessagesRaw) {

      var getMultiplier = function(key, user) {
        if (key === '_total') {
          return 1;
        }
        if (key === user) {
          return -1;
        }
      };

      return function(options) {

        var deferred = $q.defer();

        ReadMessagesRaw.query(function(res) {
          
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

          deferred.resolve(status);
        });

        return deferred.promise;
      };
    }
  ]);


}());