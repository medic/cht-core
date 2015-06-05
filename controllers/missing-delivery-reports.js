var _ = require('underscore'),
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
        patient_name: doc.fields && doc.fields.patient_name,
        contact: doc.contact,
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
      utils.rejectDeliveries(pregnancies, function(err, withoutDelivery) {
        if (err) {
          return callback(err);
        }
        utils.injectRisk(withoutDelivery, callback);
      });
    });
  }
};
