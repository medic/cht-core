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
        patient_name: doc.fields && doc.fields.patient_name,
        patient_id: doc.patient_id,
        weeks: utils.getWeeksPregnant(doc),
        contact: doc.contact,
        high_risk: true
      };
    }));
  });
};

var findFlagged = function(options, callback) {
  var startDate = moment().subtract(44, 'weeks');
  var dateCriteria = utils.formatDateRange('reported_date', startDate);
  var query = 'errors<int>:0 AND form:' + utils.getFormCode('flag') + ' AND ' + dateCriteria;
  if (options.district) {
    query += ' AND district:"' + options.district + '"';
  }
  utils.fti('data_records', { q: query, include_docs: true }, callback);
};

module.exports = {
  get: function(options, callback) {
    findFlagged(options, function(err, flagged) {
      if (err) {
        return callback(err);
      }
      options.patientIds = _.map(flagged.rows, function(row) {
        return row.doc.fields && row.doc.fields.patient_id;
      });
      getPregnancies(options, function(err, pregnancies) {
        if (err) {
          return callback(err);
        }
        utils.rejectDeliveries(pregnancies, function(err, withoutDelivery) {
          if (err) {
            return callback(err);
          }
          utils.injectVisits(withoutDelivery, callback);
        });
      });
    });
  }
};
