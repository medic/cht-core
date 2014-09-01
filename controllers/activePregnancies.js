var utils = require('./utils'),
    _ = require('underscore');

module.exports = {
  get: function(options, callback) {
    utils.getAllRecentRegistrations(options, function(err, registrations) {
      if (err) {
        return callback(err);
      }
      var patientIds = _.map(registrations.rows, function(row) {
        return row.doc.patient_id;
      });
      utils.getAllDeliveries(patientIds, function(err, deliveries) {
        if (err) {
          return callback(err);
        }
        callback(null, {
          count: patientIds.length - deliveries.total_rows
        });
      });
    });
  }
};
