var utils = require('./utils'),
    _ = require('underscore');

// TODO restrict to district for district admin and filters
module.exports = {
  get: function(callback) {
    utils.getAllRecentRegistrations(function(err, registrations) {
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
