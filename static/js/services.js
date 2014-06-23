var inboxServices = angular.module('inboxServices', ['ngResource']);

inboxServices.factory('Message', ['$resource',
  function($resource) {
    // TODO read from filters
    //var form = 'null_form'; // message
    // TODO read from filters
    var startdate = 1401000000000; 
    var enddate = 1402529477402;
    // TODO get base url from somewhere
    var baseUrl = 'http://localhost:5984/kujua-lite/_design/kujua-lite/_rewrite/';
    return $resource(baseUrl + 'data_records', {}, {
      query: {
        method: 'GET',
        params: { 
          startkey: '[' + startdate + ']',
          endkey: '[' + enddate + ']',
          include_docs: true,
          limit: 1000
        },
        isArray: true
      }
    });
  }
]);