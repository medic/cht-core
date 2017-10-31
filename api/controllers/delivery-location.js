var _ = require('underscore'),
    db = require('../db');

module.exports = {
  get: function(options, callback) {
    var district = options.district || '_admin';
    var query = { 
      group: true,
      startkey: [district],
      endkey: [district, {}]
    };
    db.medic.view('medic', 'delivery_reports_by_district_and_code', query, function(err, response) {
      if (err) {
        return callback(err);
      }
      if (!response || !response.rows) {
        return callback(null, []);
      }
      callback(null, _.map(['F','S','NS'], function(code) {
        var row = _.find(response.rows, function(row) {
          return row.key[1] === code;
        });
        return {
          key: code,
          value: row ? row.value : 0
        };
      }));
    });
  }
};
