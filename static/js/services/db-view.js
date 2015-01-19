var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('DbView', ['$resource', 'BaseUrlService',
    function($resource, BaseUrlService) {

      return function(viewName, options, callback) {
        var url = BaseUrlService() + '/../_view/' + viewName;
        options.startkey = JSON.stringify(options.startkey);
        options.endkey = JSON.stringify(options.endkey);
        options.cache = true;
        $resource(url).get(
          options,
          function(results) {
            if (options.include_docs) {
              results = _.pluck(results && results.rows, 'doc');
            }
            callback(null, results);
          },
          function(err) {
            callback(err);
          }
        );
      };

    }
  ]);

}());