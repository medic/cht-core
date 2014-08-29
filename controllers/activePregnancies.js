var db = require('../db'),
    moment = require('moment'),
    _ = require('underscore');

var formatDate = function(date) {
  return date.zone(0).format('YYYY-MM-DD');
};

var generateQuery = function(form, startDate, endDate) {
  return 'form:' + form + ' ' +
    'AND errors<int>:0 ' +
    'AND reported_date<date>:[' + formatDate(startDate) +
      ' TO ' + formatDate(endDate.clone().add(1, 'days')) + ']';
};

var getAllRecentRegistrations = function(callback) {
  var now = moment();
  var query = '(' + generateQuery('R', now.clone().subtract(42, 'weeks'), now) + ') ' +
           'OR (' + generateQuery('P', now.clone().subtract(44, 'weeks'), now) + ')';
  db.fti('data_records', {
    q: query,
    include_docs: true,
    limit: 1000
  }, callback);
};

var getAllDeliveries = function(patientIds, callback) {
  db.fti('data_records', {
    q: 'form:D AND patient_id:(' + patientIds.join(' OR ') + ')'
  }, callback);
};

// TODO restrict to district for district admin and filters
module.exports = {
  get: function(callback) {
    getAllRecentRegistrations(function(err, registrations) {
      if (err) {
        return callback(err);
      }
      var patientIds = _.map(registrations.rows, function(row) {
        return row.doc.patient_id;
      });
      getAllDeliveries(patientIds, function(err, deliveries) {
        if (err) {
          return callback(err);
        }
        callback(null, {
          count: patientIds.length - deliveries.total_rows
        });
      });
    });
  }
};
