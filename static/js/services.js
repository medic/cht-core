var inboxServices = angular.module('inboxServices', ['ngResource']);

inboxServices.factory('Settings', ['$resource',
  function($resource) {
    var baseUrl = $('html').data('base-url');
    return $resource(baseUrl + '/app_settings/medic', {}, {
      query: {
        method: 'GET',
        isArray: false
      }
    });
  }
]);

inboxServices.factory('Facility', ['$resource',
  function($resource) {
    var baseUrl = $('html').data('base-url');
    return $resource(baseUrl + '/facilities.json', {}, {
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