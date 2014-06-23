var inboxServices = angular.module('inboxServices', ['ngResource']);

inboxServices.factory('Message', ['$resource',
  function($resource) {
    // TODO read from filters
    var startdate = 0; 
    var enddate = 1902529477402;
    var baseUrl = $('html').data('base-url');
    return $resource(baseUrl + '/data_records', {}, {
      query: {
        method: 'GET',
        params: { 
          startkey: '[' + enddate + ']',
          endkey: '[' + startdate + ']',
          descending: true,
          include_docs: true,
          limit: 1000
        },
        isArray: true
      }
    });
  }
]);

inboxServices.factory('Settings', ['$resource',
  function($resource) {
    var baseUrl = $('html').data('base-url');
    return $resource(baseUrl + '/app_settings/kujua-lite', {}, {
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
    return $resource(baseUrl + '/facilities_select2.json', {}, {
      query: {
        method: 'GET',
        isArray: true
      }
    });
  }
]);