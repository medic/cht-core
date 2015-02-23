var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('Search', ['$resource', 'FormatDataRecord',
    function($resource, FormatDataRecord) {

      var formatResults = function(data, callback) {
        FormatDataRecord(data.rows).then(function(res) {
          callback(null, {
            results: res,
            total_rows: data.total_rows
          });
        });
      };

      return function(options, callback) {

        if (options.query) {
          options.q = JSON.stringify(options.query);
          options.query = undefined;
        }
        if (options.schema) {
          options.schema = JSON.stringify(options.schema);
        }

        _.defaults(options, {
          limit: 50,
          sort: '\\reported_date<date>',
          include_docs: true
        });

        $resource('/api/v1/fti/data_records').get(
          options,
          function(data) {
            formatResults(data, callback);
          },
          function(err) {
            callback(err);
          }
        );

      };
    }
  ]);

}());