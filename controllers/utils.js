var db = require('../db'),
    moment = require('moment');

var formatPatientIds = function(patientIds) {
  return 'patient_id:(' + patientIds.join(' OR ') + ')';
};

var formatDate = function(date) {
  return date.zone(0).format('YYYY-MM-DD');
};

var formatDateRange = function(startDate, endDate) {
  var start = formatDate(startDate);
  var end = formatDate(endDate.clone().add(1, 'days'));
  return 'reported_date<date>:[' + start + ' TO ' + end + ']';
};

var generateRegistrationQuery = function(form, startDate, endDate) {
  return 'form:' + form + ' ' +
     'AND errors<int>:0 ' +
     'AND ' + formatDateRange(startDate, endDate);
};

module.exports = {

  getAllRecentRegistrations: function(options, callback) {
    var today = moment().startOf('day');
    var query = '((' + generateRegistrationQuery('R', today.clone().subtract(42, 'weeks'), today) + ') ' +
              'OR (' + generateRegistrationQuery('P', today.clone().subtract(44, 'weeks'), today) + '))';
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

  getRecentVisits: function(patientIds, callback) {
    var startDate = moment().subtract(7, 'days');
    var endDate = moment();
    var query = 'form:V ' +
           'AND ' + formatDateRange(startDate, endDate) + ' ' +
           'AND ' + formatPatientIds(patientIds);
    db.fti('data_records', {
      q: query,
      limit: 1000,
      include_docs: true
    }, callback);
  }

};