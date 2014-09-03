var _ = require('underscore'),
    visits = require('./visits'),
    utils = require('./utils');

var filterToComplete = function(visits, options, callback) {
  utils.getBirthPatientIds(options, function(err, patientIds) {
    if (err) {
      return callback(err);
    }
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
      filterToComplete(patientVisits, options, function(err, filtered) {
        if (err) {
          return callback(err);
        }
        callback(null, visits.cumulativeCount(filtered));
      });
    });
  }
};
