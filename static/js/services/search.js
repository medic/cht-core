var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('Search', ['$rootScope', 'db', 'FormatDataRecord',
    function($rootScope, db, FormatDataRecord) {

      var formatResults = function(err, data, callback) {
        if (err) {
          return callback(err);
        }
        FormatDataRecord(data.rows).then(function(res) {
          callback(null, {
            results: res,
            total_rows: data.total_rows
          });
        });
      };

      return function(options, callback) {

        _.defaults(options, {
          limit: 50,
          q: options.query,
          skip: 0,
          sort: '\\reported_date<date>',
          include_docs: true
        });

        options.query = undefined;

        db.getFTI(
          'medic',
          'data_records',
          options,
          function(err, data) {
            formatResults(err, data, function(err, data) {
              callback(err, data);
              if (!$rootScope.$$phase) {
                $rootScope.$apply();
              }
            });
          }
        );

      };
    }
  ]);

}());