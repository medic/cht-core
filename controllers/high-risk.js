var _ = require('underscore'),
    moment = require('moment'),
    utils = require('./utils');

var getPregnancies = function(options, callback) {
  utils.getAllRegistrations(options, function(err, registrations) {
    if (err) {
      return callback(err);
    }
    callback(null, _.map(registrations.rows, function(registration) {
      var doc = registration.doc;
      return {
        patient_name: doc.patient_name,
        patient_id: doc.patient_id,
        weeks: utils.getWeeksPregnant(doc),
        clinic: doc.related_entities && doc.related_entities.clinic
      };
    }));
  });
};

var findFlagged = function(pregnancies, callback) {
  if (!pregnancies.length) {
    return callback(null, []);
  }
  var options = {
    patientIds: _.pluck(pregnancies, 'patient_id')
  };
  utils.getHighRisk(options, function(err, highRisks) {
    if (err) {
      return callback(err);
    }
    callback(null, _.filter(pregnancies, function(pregnancy) {
      return _.some(highRisks.rows, function(highRisk) {
        return highRisk.doc.patient_id === pregnancy.patient_id;
      });
    }));
  });
};

module.exports = {
  get: function(options, callback) {
    getPregnancies(options, function(err, pregnancies) {
      if (err) {
        return callback(err);
      }
      utils.rejectDeliveries(pregnancies, function(err, withoutDelivery) {
        if (err) {
          return callback(err);
        }
        findFlagged(withoutDelivery, callback);
      });
    });
  }
};
