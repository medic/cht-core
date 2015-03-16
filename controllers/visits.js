var _ = require('underscore'),
    db = require('../db');

module.exports = {

  /**
   * Get the visit counts per patient
   */
  get: function(options, callback) {
    var district = options.district || '_admin';
    var query = { 
      group: true,
      startkey: [district],
      endkey: [district, {}]
    };
    db.medic.view('medic', 'visits_by_district_and_patient', query, function(err, visits) {
      if (err) {
        return callback(err);
      }
      if (!visits || !visits.rows) {
        return callback(null, []);
      }
      callback(null, visits.rows);
    });
  },

  /**
   * Format visit counts per patient to a cumulative count across all patients
   */
  cumulativeCount: function(visits) {
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
  }

};
