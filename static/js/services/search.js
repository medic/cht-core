var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('Search', ['db', 'FormatDataRecord',
    function(db, FormatDataRecord) {
      return function(options, callback) {

        _.defaults(options, {
          limit: 50,
          q: options.query,
          skip: 0,
          sort: '\\reported_date',
          include_docs: true
        });

        db.getFTI(
          'medic',
          'data_records',
          options,
          function(err, data) {
            if (err) {
              return callback(err);
            }
            FormatDataRecord(data.rows).then(function(res) {
              callback(null, {
                results: res,
                total_rows: data.total_rows
              });
            });
          }
        );

      };
    }
  ]);

}());