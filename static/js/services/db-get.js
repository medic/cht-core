var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('DbGet', ['HttpWrapper', 'BaseUrlService',
    function(HttpWrapper, BaseUrlService) {
      return function(keys, options, callback) {
        if (!options.params) {
          options.params = {};
        }
        options.params.include_docs = true;
        var url = BaseUrlService() + '/../../../_all_docs';
        if (!_.isArray(keys)) {
          keys = [ keys ];
        }
        HttpWrapper
          .post(url, { keys: keys }, options)
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
          .error(callback);
      };
    }
  ]);

}());
