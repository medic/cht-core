(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices', ['ngResource']);

  inboxServices.factory('Settings', ['$resource', 'BaseUrlService',
    function($resource, BaseUrlService) {
      return $resource(BaseUrlService() + '/app_settings/medic', {}, {
        query: {
          method: 'GET',
          isArray: false,
          cache: true
        }
      });
    }
  ]);

  inboxServices.factory('User', ['$resource', 'UserNameService',
    function($resource, UserNameService) {
      return $resource('/_users/org.couchdb.user%3A' + UserNameService(), {}, {
        query: {
          method: 'GET',
          isArray: false,
          cache: true
        }
      });
    }
  ]);

  inboxServices.factory('Facility', ['$resource', 'BaseUrlService',
    function($resource, BaseUrlService) {
      return $resource(BaseUrlService() + '/facilities.json', {}, {
        query: {
          method: 'GET',
          isArray: false,
          params: {
            startkey: '["clinic"]',
            endkey: '["clinic"]'
          }
        }
      });
    }
  ]);

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

      return {
        get: function(options) {

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
              if (!options.userDistrict || options.userDistrict === dist) {
                var username = getUsername(name, options.user);
                if (username) {
                  status[type][username] += row.value;
                }
              }
            });

            deferred.resolve(status);
          });

          return deferred.promise;
        }
      };
    }
  ]);

  inboxServices.factory('RememberService', function() {
    return {
      scrollTop: undefined,
      dateFormat: 'DD-MMM-YYYY hh:mm'
    };
  });

  inboxServices.factory('BaseUrlService', function() {
    return function() {
      return $('html').data('base-url');
    };
  });

  inboxServices.factory('UserNameService', function() {
    return function() {
      return $('html').data('user');
    };
  });

}());