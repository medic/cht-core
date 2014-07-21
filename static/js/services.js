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

  inboxServices.factory('ReadMessages', ['$resource', 'BaseUrlService',
    function($resource, BaseUrlService) {
      return $resource(BaseUrlService() + '/../_view/data_records_read_by_type', {}, {
        query: {
          method: 'GET',
          isArray: false,
          params: {
            group: true
          }
        }
      });
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