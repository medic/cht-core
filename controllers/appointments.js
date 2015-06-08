var utils = require('./utils'),
    _ = require('underscore'),
    moment = require('moment');

var getAppointmentDate = function(options, registration) {
  var seenGroups = [];
  var appointment = _.find(registration.scheduled_tasks, function(task) {
    if (_.contains(seenGroups, task.group)) {
      return false;
    }
    seenGroups.push(task.group);
    var due = moment(task.due);
    return due.isAfter(options.startDate) && due.isBefore(options.endDate);
  });
  return appointment ? moment(appointment.due) : null;
};

var getAppointments = function(options, callback) {
  utils.getAllRegistrations({}, function(err, registrations) {
    if (err) {
      return callback(err);
    }
    callback(null, _.compact(
      _.map(registrations.rows, function(registration) {
        var doc = registration.doc;
        var date = getAppointmentDate(options, doc);
        if (date) {
          return {
            patient_name: doc.fields && doc.fields.patient_name,
            patient_id: doc.patient_id,
            contact: doc.contact,
            date: date,
            weeks: utils.getWeeksPregnant(doc)
          };
        }
      })
    ));
  });
};

var rejectVisits = function(appointments, callback) {
  if (!appointments.length) {
    return callback(null, []);
  }
  var options = {
    patientIds: _.pluck(appointments, 'patient_id'),
    startDate: moment().subtract(7, 'days')
  };
  utils.getVisits(options, function(err, visits) {
    if (err) {
      return callback(err);
    }
    callback(null, _.reject(appointments, function(appointment) {
      return _.some(visits.rows, function(visit) {
        return visit.doc.fields.patient_id === appointment.patient_id;
      });
    }));
  });
};

module.exports = {
  get: function(options, callback) {
    getAppointments(options, function(err, appointments) {
      if (err) {
        return callback(err);
      }
      utils.rejectDeliveries(appointments, function(err, withoutDelivery) {
        if (err) {
          return callback(err);
        }
        rejectVisits(withoutDelivery, function(err, withoutVisit) {
          if (err) {
            return callback(err);
          }
          utils.injectVisits(withoutVisit, function(err, withVisit) {
            if (err) {
              return callback(err);
            }
            utils.injectRisk(withVisit, callback);
          });
        });
      });
    });
  }
};
