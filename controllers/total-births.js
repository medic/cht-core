var utils = require('./utils'),
    _ = require('underscore');

var collectPatientIds = function(records, callback) {
  callback(null, _.map(records.rows, function(row) {
    return row.doc.patient_id;
  }));
};

var getRegistrationPatientIds = function(options, callback) {
  options.minWeeksPregnant = 42;
  options.maxWeeksPregnant = 10000;
  utils.getAllRegistrations(options, function(err, registrations) {
    if (err) {
      return callback(err);
    }
    collectPatientIds(registrations, callback);
  });
};

var getDeliveryPatientIds = function(options, callback) {
  options.include_docs = true;
  utils.getDeliveries(options, function(err, deliveries) {
    if (err) {
      return callback(err);
    }
    collectPatientIds(deliveries, callback);
  });
};

module.exports = {
  get: function(options, callback) {
    getRegistrationPatientIds(options, function(err, registrationPatientIds) {
      if (err) {
        return callback(err);
      }
      getDeliveryPatientIds(options, function(err, deliveryPatientIds) {
        if (err) {
          return callback(err);
        }
        callback(null, {
          count: _.union(deliveryPatientIds, registrationPatientIds).length
        });
      });
    });
  }
};
