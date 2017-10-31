var _ = require('underscore'),
    visits = require('./visits'),
    utils = require('./utils');

var filterOutOldPregnancies = function(visits, options, callback) {
  utils.getAllRegistrations(options, function(err, registrations) {
    if (err) {
      return callback(err);
    }
    var patientIds = _.map(registrations.rows, function(registration) {
      return registration.doc.patient_id;
    });
    callback(null, _.filter(visits, function(row) {
      return _.contains(patientIds, row.key[1]);
    }));
  });
};

var filterOutDelivererdPregnancies = function(visits, options, callback) {
  var pregnancies = _.map(visits, function(visit) {
    return { patient_id: visit.key[1] };
  });
  utils.rejectDeliveries(pregnancies, function(err, withoutDelivery) {
    if (err) {
      return callback(err);
    }
    var patientIds = _.pluck(withoutDelivery, 'patient_id');
    callback(null, _.filter(visits, function(row) {
      return _.contains(patientIds, row.key[1]);
    }));
  });
};

module.exports = {
  get: function(options, callback) {
    visits.get(options, function(err, patientVisits) {
      if (err) {
        return callback(err);
      }
      if (!patientVisits.length) {
        return callback(null, visits.cumulativeCount(patientVisits));
      }
      filterOutOldPregnancies(patientVisits, options, function(err, recentVisits) {
        if (err) {
          return callback(err);
        }
        filterOutDelivererdPregnancies(recentVisits, options, function(err, filtered) {
          if (err) {
            return callback(err);
          }
          callback(null, visits.cumulativeCount(filtered));
        });
      });
    });
  }
};
