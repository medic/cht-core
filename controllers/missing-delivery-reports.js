var _ = require('underscore'),
    moment = require('moment'),
    utils = require('./utils');


var getRegistrationPatientIds = function(options, callback) {
  options.minWeeksPregnant = 42;
  options.maxWeeksPregnant = 10000;
  utils.getAllRegistrations(options, function(err, registrations) {
    if (err) {
      return callback(err);
    }
    callback(null, _.map(registrations.rows, function(row) {
      var doc = row.doc;
      return {
        patient_id: doc.patient_id,
        patient_name: doc.patient_name,
        clinic: doc.related_entities && doc.related_entities.clinic,
        edd: utils.getEDD(doc)
      };
    }));
  });
};

module.exports = {
  get: function(options, callback) {
    getRegistrationPatientIds(options, function(err, pregnancies) {
      if (err) {
        return callback(err);
      }
      utils.rejectDeliveries(pregnancies, callback);
    });
  }
};
