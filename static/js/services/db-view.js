var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('DbView', ['pouchDB',
    function(pouchDb) {
      return function(viewName, options, callback) {
        pouchDB('medic')
          .query('medic/' + viewName, options.params)
          .then(function(results) {
            var meta = {
              total_rows: results.total_rows,
              offset: results.offset
            };
            if (options.params && options.params.include_docs) {
              results = _.pluck(results && results.rows, 'doc');
            }
            callback(null, results, meta);
          })
          .catch(function(data) {
            callback(new Error(data));
          });
      };
    }
  ]);

}());
