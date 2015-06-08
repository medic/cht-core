var _ = require('underscore'),
    moment = require('moment'),
    utils = require('./utils');

var addMissingData = function(counts) {
  var end = moment().startOf('month');
  var date = end.clone().subtract(1, 'years');
  while(date.isBefore(end)) {
    var key = date.toISOString();
    if (!counts[key]) {
      counts[key] = 0;
    }
    date.add(1, 'months');
  }
};

var formatDates = function(dates) {
  var counts = _.countBy(dates, function(date) {
    return date.startOf('month').toISOString();
  });
  addMissingData(counts);
  var sorted = _.sortBy(_.pairs(counts), function(count) { 
    return count[0];
  });
  return _.map(sorted, function(elem) {
    return {
      month: moment(elem[0]).format('MMM YYYY'),
      count: elem[1]
    };
  });
};

var getRegistrations = function(options, results, callback) {
  options.minWeeksPregnant = 42;
  options.maxWeeksPregnant = 94; // 42 + 52, possibly delivered a year ago
  utils.getAllRegistrations(options, function(err, registrations) {
    if (err) {
      return callback(err);
    }
    _.each(registrations.rows, function(registration) {
      var edd = utils.getEDD(registration.doc).date;
      if (edd.isAfter(options.startDate) && edd.isBefore(options.endDate)) {
        results[registration.doc.patient_id] = edd.startOf('month');
      }
    });
    callback(null, results);
  });
};

var getDeliveries = function(options, results, callback) {
  options.include_docs = true;
  utils.getDeliveries(options, function(err, deliveries) {
    if (err) {
      return callback(err);
    }
    _.each(deliveries, function(delivery) {
      var edd = moment(delivery.doc.reported_date).startOf('month');
      results[delivery.doc.fields.patient_id] = edd;
    });
    callback(null, results);
  });
};

module.exports = {
  get: function(options, callback) {
    options.endDate = moment().startOf('month');
    options.startDate = options.endDate.clone().subtract(1, 'years');

    var results = {};
    getRegistrations(options, results, function(err, registrationResults) {
      if (err) {
        return callback(err);
      }
      getDeliveries(options, registrationResults, function(err, deliveryResults) {
        if (err) {
          return callback(err);
        }
        callback(null, formatDates(_.values(deliveryResults)));
      });
    });
  }
};
