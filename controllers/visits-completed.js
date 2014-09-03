var _ = require('underscore'),
    db = require('../db'),
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

var getVisitsAtLeast = function(visits) {
  var results = [0, 0, 0, 0];

  // update each position in results with the count of prenancies
  // which had that number of visits
  _.each(visits, function(visit) {
    var index = visit.value - 1;
    if (index > 3) {
      index = 3;
    }
    results[index]++;
  });

  // increment each position to count "at least" that many visits
  for (var i = results.length - 1; i > 0; i--) {
    results[i - 1] += results[i];
  }
  return results;
};

module.exports = {
  get: function(options, callback) {
    var district = options.district || '_admin';
    var query = { 
      group: true,
      startkey: [district],
      endkey: [district, {}]
    };
    db.getView('visits_by_district_and_patient', query, function(err, visits) {
      if (err) {
        return callback(err);
      }
      if (!visits || !visits.rows || !visits.rows.length) {
        return callback(null, [0, 0, 0, 0]);
      }
      filterToComplete(visits.rows, options, function(err, filtered) {
        if (err) {
          return callback(err);
        }
        callback(null, getVisitsAtLeast(filtered));
      });
    });
  }
};
