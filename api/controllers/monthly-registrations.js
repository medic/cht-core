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

var formatRegistrations = function(registrations) {
  var counts = _.countBy(registrations, function(registration) {
    return moment(registration.doc.reported_date).startOf('month').toISOString();
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

module.exports = {
  get: function(options, callback) {
    var endDate = moment().startOf('month');
    var startDate = endDate.clone().subtract(1, 'years');
    var query = 'errors<int>:0 AND ' +
              'form:(' + utils.getFormCode('registration') + ' OR ' + utils.getFormCode('registrationLmp') + ') AND ' +
              utils.formatDateRange('reported_date', startDate, endDate);
    if (options.district) {
      query += ' AND district:"' + options.district + '"';
    }
    utils.fti('data_records', { q: query, include_docs: true }, function(err, registrations) {
      if (err) {
        return callback(err);
      }
      callback(null, formatRegistrations(registrations.rows));
    });
  }
};
