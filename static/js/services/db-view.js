var _ = require('underscore'),
    escape = ['startkey','endkey','key'];

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('DbView', ['HttpWrapper', 'BaseUrlService',
    function(HttpWrapper, BaseUrlService) {
      return function(viewName, options, callback) {
        if (!options.params) {
          options.params = {};
        }
        escape.forEach(function(key) {
          if (options.params[key]) {
            options.params[key] = JSON.stringify(options.params[key]);
          }
        });
        var url = BaseUrlService() + '/../_view/' + viewName;
        HttpWrapper.get(url, options)
          .success(function(results) {
            var meta = {
              total_rows: results.total_rows,
              offset: results.offset
            };
            if (options.params.include_docs) {
              results = _.pluck(results && results.rows, 'doc');
            }
            callback(null, results, meta);
          })
          .error(function(data) {
            callback(new Error(data));
          });
      };
    }
  ]);

}());
