var _ = require('underscore'),
    moment = require('moment'),
    utils = require('./utils');

var getEDD = function(doc) {
  if (doc.form === 'R') {
    return {
      date: moment(doc.reported_date).add(40, 'weeks'),
      approximate: true
    }
  }
  return {
    date: moment(doc.lmp_date).add(42, 'weeks')
  }
};

var getPregnancies = function(options, callback) {
  options.minWeeksPregnant = 37;
  options.maxWeeksPregnant = 42;
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
        edd: getEDD(doc)
      };
    }));
  });
};

var getAppointmentDates = function(pregnancies, callback) {
  if (!pregnancies.length) {
    return callback(null, []);
  }
  var options = {
    patientIds: _.pluck(pregnancies, 'patient_id'),
    startDate: moment().subtract(42, 'weeks')
  };
  utils.getVisits(options, function(err, visits) {
    if (err) {
      return callback(err);
    }
    _.each(pregnancies, function(pregnancy) {
      _.each(visits.rows, function(visit) {
        if (visit.doc.patient_id === pregnancy.patient_id) {
          var appointmentDate = moment(visit.doc.reported_date);
          if (!pregnancy.lastAppointmentDate || 
              pregnancy.lastAppointmentDate.isBefore(appointmentDate)) {
            pregnancy.lastAppointmentDate = appointmentDate;
          }
        } 
      });
    });
    callback(null, pregnancies);
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
        getAppointmentDates(withoutDelivery, callback);
      });
    });
  }
};
