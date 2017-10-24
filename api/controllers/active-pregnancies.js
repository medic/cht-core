var utils = require('./utils'),
    _ = require('underscore');

module.exports = {
  get: function(options, callback) {
    utils.getAllRegistrations(options, function(err, registrations) {
      if (err) {
        return callback(err);
      }
      if (!registrations.rows.length) {
        return callback(null, { count: 0 });
      }
      var patientIds = _.map(registrations.rows, function(row) {
        return row.doc.patient_id;
      });
      utils.getDeliveries({ patientIds: patientIds }, function(err, deliveries) {
        if (err) {
          return callback(err);
        }
        callback(null, {
          count: patientIds.length - deliveries.length
        });
      });
    });
  }
};
