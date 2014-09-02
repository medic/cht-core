var _ = require('underscore'),
    moment = require('moment'),
    db = require('../db');

var formatPatientIds = function(patientIds) {
  return 'patient_id:(' + patientIds.join(' OR ') + ')';
};

var formatDate = function(date) {
  return date.zone(0).format('YYYY-MM-DD');
};

var formatDateRange = function(field, startDate, endDate) {
  var start = formatDate(startDate);
  var end = formatDate(endDate.clone().add(1, 'days'));
  return field + '<date>:[' + start + ' TO ' + end + ']';
};

module.exports = {

  getAllRecentRegistrations: function(options, callback) {
    var minWeeksPregnant = options.minWeeksPregnant || 0;
    var maxWeeksPregnant = options.maxWeeksPregnant || 42;
    var startDate = moment().subtract(maxWeeksPregnant, 'weeks');
    var endDate = moment().subtract(minWeeksPregnant, 'weeks');
    var rDateCriteria = formatDateRange('reported_date', startDate, endDate);
    var pDateCriteria = formatDateRange('lmp_date', startDate.subtract(2, 'weeks'), endDate.subtract(2, 'weeks'));
    var query = 'errors<int>:0 AND ((form:R AND ' + rDateCriteria + ') OR (form:P AND ' + pDateCriteria + '))';
    if (options.district) {
      query += ' AND district:"' + options.district + '"';
    }
    db.fti('data_records', {
      q: query,
      include_docs: true,
      limit: 1000
    }, callback);
  },

  getAllDeliveries: function(patientIds, options, callback) {
    if (!callback) {
      callback = options;
      options = {};
    }
    options.limit = 1000;
    options.q = 'form:D AND ' + formatPatientIds(patientIds);
    db.fti('data_records', options, callback);
  },

  rejectDeliveries: function(objects, callback) {
    if (!objects.length) {
      return callback(null, []);
    }
    var patientIds = _.pluck(objects, 'patient_id');
    module.exports.getAllDeliveries(patientIds, { include_docs: true }, function(err, deliveries) {
      if (err) {
        return callback(err);
      }
      callback(null, _.reject(objects, function(object) {
        return _.some(deliveries.rows, function(delivery) {
          return delivery.doc.patient_id === object.patient_id;
        });
      }));
    });
  },

  getVisits: function(options, callback) {
    if (!options || !options.patientIds || !options.patientIds.length) {
      return callback(null, []);
    }
    var startDate = options.startDate;
    var endDate = options.endDate || moment();
    var query = 'form:V ' +
           'AND ' + formatDateRange('reported_date', startDate, endDate) + ' ' +
           'AND ' + formatPatientIds(options.patientIds);
    db.fti('data_records', { q: query, limit: 1000, include_docs: true }, callback);
  },

  getHighRisk: function(options, callback) {
    if (!options || !options.patientIds || !options.patientIds.length) {
      return callback(null, []);
    }
    var query = 'form:F AND ' + formatPatientIds(options.patientIds);
    db.fti('data_records', { q: query, limit: 1000, include_docs: true }, callback);
  },

  getWeeksPregnant: function(doc) {
    if (doc.form === 'R') {
      return {
        number: moment().diff(moment(doc.reported_date), 'weeks'),
        approximate: true
      }
    }
    return {
      number: moment().diff(moment(doc.lmp_date), 'weeks') - 2
    }
  }

};