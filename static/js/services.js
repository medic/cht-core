var inboxServices = angular.module('inboxServices', ['ngResource']);

inboxServices.factory('Message', ['$resource',
  function($resource) {
    return $resource('http://localhost:5984/kujua-lite/_design/kujua-lite/_view/data_records', {}, {
      query: {
        method: 'GET',
        params: { include_docs: true, startkey: '[1401000000000]', endkey: '[1402529477402]' },
        isArray:false
      }
    });
  }
]);