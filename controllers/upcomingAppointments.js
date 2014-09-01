var utils = require('./utils'),
    _ = require('underscore'),
    moment = require('moment');

var getUpcomingAppointmentDate = function(registration) {
  var seenGroups = [];
  var start = moment().startOf('day');
  var end = start.clone().add(12, 'days');
  var appointment = _.find(registration.scheduled_tasks, function(task) {
    if (_.contains(seenGroups, task.group)) {
      return false;
    }
    seenGroups.push(task.group);
    var due = moment(task.due);
    return due.isAfter(start) && due.isBefore(end);
  });
  return appointment ? moment(appointment.due) : null;
};

var getAppointments = function(callback) {
  utils.getAllRecentRegistrations(function(err, registrations) {
    if (err) {
      return callback(err);
    }
    callback(null, _.compact(
      _.map(registrations.rows, function(registration) {
        var doc = registration.doc;
        var date = getUpcomingAppointmentDate(doc);
        if (date) {
          var weeks;
          if (doc.form === 'R') {
            weeks = {
              number: moment().diff(moment(doc.reported_date), 'weeks'),
              approximate: true
            }
          } else {
            weeks = {
              number: moment().diff(moment(doc.lmp_date), 'weeks') - 2
            }
          }
          return {
            patient_name: doc.patient_name,
            patient_id: doc.patient_id,
            clinic: doc.related_entities && doc.related_entities.clinic,
            date: date,
            weeks: weeks
          }
        }
      })
    ));
  });
};

var removeDeliveries = function(appointments, callback) {
  var patientIds = _.pluck(appointments, 'patient_id');
  utils.getAllDeliveries(_.pluck(appointments, 'patient_id'), { include_docs: true }, function(err, deliveries) {
    if (err) {
      return callback(err);
    }
    callback(null, _.reject(appointments, function(appointment) {
      return _.some(deliveries.rows, function(delivery) {
        return delivery.doc.patient_id === appointment.patient_id;
      });
    }));
  });
};

var removeVisits = function(appointments, callback) {
  var patientIds = _.pluck(appointments, 'patient_id');
  utils.getRecentVisits(patientIds, function(err, visits) {
    if (err) {
      return callback(err);
    }
    callback(null, _.reject(appointments, function(appointment) {
      return _.some(visits.rows, function(visit) {
        return visit.doc.patient_id === appointment.patient_id;
      });
    }));
  });
};

// TODO restrict to district for district admin and filters
module.exports = {
  get: function(callback) {
    getAppointments(function(err, appointments) {
      if (err) {
        return callback(err);
      }
      removeDeliveries(appointments, function(err, withoutDelivery) {
        if (err) {
          return callback(err);
        }
        removeVisits(withoutDelivery, callback);
      });
    });
  }
};
