var _ = require('underscore'),
    escape = ['startkey','endkey','key'];

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('DbView', ['HttpWrapper', 'BaseUrlService',
    function(HttpWrapper, BaseUrlService) {
      return function(viewName, params, callback) {
        var url = BaseUrlService() + '/../_view/' + viewName;
        escape.forEach(function(key) {
          if (params[key]) {
            params[key] = JSON.stringify(params[key]);
          }
        });
        HttpWrapper.get(url, { params: params })
          .success(function(results) {
            var meta = {
              total_rows: results.total_rows,
              offset: results.offset
            };
            if (params.include_docs) {
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
