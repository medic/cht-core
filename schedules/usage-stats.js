var _ = require('underscore'),
    moment = require('moment'),
    async = require('async'),
    db = require('../db'),
    utils = require('../controllers/utils'),
    visits = require('../controllers/visits');

var getView = function(name, query, callback) {
  if (!callback) {
    callback = query;
    query = {};
  }
  var startDate = moment().subtract(1, 'month').startOf('month');
  query.startkey = [ startDate.year(), startDate.month() ];
  query.endkey = [ startDate.year(), startDate.month(), {} ];
  db.medic.view('medic', name, query, callback);
};

var runIfNeeded = function(callback) {
  getView('usage_stats_by_year_month', function(err, response) {
    if (err) {
      return callback(err);
    }
    callback(null, response.rows.length === 0);
  });
};

var fetchValidFormSubmissions = function(callback) {
  var params = { group: true, group_level: 3 };
  getView('data_records_by_year_month_form_facility', params, function(err, response) {
    if (err) {
      return callback(err);
    }
    var result = { _totalReports: 0 };
    _.each(response.rows, function(row) {
      var code = row.key[2];
      if (code) {
        result._totalReports += row.value;
        result[row.key[2]] = row.value;
      } else {
        result._totalMessages = row.value;
      }
    });
    callback(null, result);
  });
};

var fetchDeliveryLocations = function(callback) {
  getView('delivery_reports_by_year_month_and_code', { group: true }, function(err, response) {
    if (err) {
      return callback(err);
    }
    if (!response || !response.rows) {
      return callback(null, []);
    }
    var result = {};
    _.each(response.rows, function(row) {
      result[row.key[2]] = row.value;
    });
    callback(null, result);
  });
};

var fetchActiveFacilities = function(callback) {
  getView('data_records_by_year_month_form_facility', { group: true }, function(err, response) {
    if (err) {
      return callback(err);
    }
    var results = {};
    var seen = [];
    var seenReports = [];
    _.each(response.rows, function(row) {
      var formCode = row.key[2] || '_totalMessages';
      var facilityId = row.key[3];
      if (!_.contains(seen, facilityId)) {
        seen.push(facilityId);
      }
      if (row.key[2] && !_.contains(seenReports, facilityId)) {
        seenReports.push(facilityId);
      }
      if (!results[formCode]) {
        results[formCode] = 0;
      }
      results[formCode]++;
    });
    results._totalReports = seenReports.length;
    results._total = seen.length;
    callback(null, results);
  });
};

var fetchEstimatedDeliveries = function(callback) {
  var startDate = moment().subtract(1, 'month').startOf('month');
  var endDate = startDate.clone().add(1, 'month');
  var options = {
    startDate: startDate,
    endDate: endDate,
  };

  // get patients who were expected to deliver in the month
  utils.getAllRegistrations(options, function(err, registrations) {
    if (err) {
      return callback(err);
    }
    var pregnancies = _.map(registrations.rows, function(registration) {
      return { patient_id: registration.doc.patient_id };
    });

    // remove all patients who are known to have delivered as
    // these may have delivered in a previous month
    utils.rejectDeliveries(pregnancies, function(err, undelivered) {
      if (err) {
        return callback(err);
      }
      options.include_docs = true;

      // add patients who are known to have delivered within the month
      utils.getDeliveries(options, function(err, deliveries) {
        if (err) {
          return callback(err);
        }
        var dPatientIds = _.map(deliveries.rows, function(row) {
          return row.doc.patient_id;
        });
        var uPatientIds = _.pluck(undelivered, 'patient_id');
        callback(null, _.union(dPatientIds, uPatientIds));
      });
    });
  });
};

var fetchVisits = function(deliveryPatientIds, callback) {
  utils.getVisits({ patientIds: deliveryPatientIds }, function(err, patientVisits) {
    if (err) {
      return callback(err);
    }
    var visitCounts = {};
    _.each(patientVisits.rows, function(row) {
      var patientId = row.doc.patient_id;
      if (visitCounts[patientId] === undefined) {
        visitCounts[patientId] = { value: 0 };
      }
      visitCounts[patientId].value++;
    });
    var cumulativeCount = visits.cumulativeCount(_.values(visitCounts));
    callback(null, {
      '1+': cumulativeCount[0],
      '2+': cumulativeCount[1],
      '3+': cumulativeCount[2],
      '4+': cumulativeCount[3]
    });
  });
};

module.exports = {
  go: function(callback) {
    runIfNeeded(function(err, run) {
      if (err || !run) {
        return callback(err);
      }
      fetchEstimatedDeliveries(function(err, deliveries) {
        if (err) {
          return callback(err);
        }
        async.parallel(
          {
            valid_form_submissions: fetchValidFormSubmissions,
            delivery_locations: fetchDeliveryLocations,
            active_facilities: fetchActiveFacilities,
            visits_per_delivery: function(callback) {
              fetchVisits(deliveries, callback);
            },
            estimated_deliveries: function(callback) {
              callback(null, deliveries.length);
            }
          },
          function(err, doc) {
            if (err) {
              return callback(err);
            }
            doc.type = 'usage_stats';
            doc.version = 2;
            doc.reported_date = moment().valueOf();
            var startDate = moment().subtract(1, 'month').startOf('month');
            doc.year = startDate.year();
            doc.month = startDate.month();
            db.medic.insert(doc, callback);
          }
        );
      });
    });
  }
};