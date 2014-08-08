(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('ReadMessagesRaw', ['$resource', 'BaseUrlService',
    function($resource, BaseUrlService) {
      return $resource(BaseUrlService() + '/../_view/data_records_read_by_type', {}, {
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

      var getUsername = function(key, user) {
        if (key === '_total') {
          return 'total';
        }
        if (key === user) {
          return 'read';
        }
      };

      return function(options) {

        var deferred = $q.defer();

        ReadMessagesRaw.query(function(res) {
          
          var status = {
            forms: { total: 0, read: 0 },
            messages: { total: 0, read: 0 }
          };
          
          res.rows.forEach(function(row) {
            var name = row.key[0];
            var type = row.key[1];
            var dist = row.key[2];

            if (!options.district || options.district === dist) {
              var username = getUsername(name, options.user);
              if (username) {
                status[type][username] += row.value;
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