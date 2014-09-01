var moment = require('moment'),
    appointments = require('./appointments');

module.exports = {
  get: function(options, callback) {
    options.startDate = moment().startOf('day').subtract(12, 'days');
    options.endDate = moment().startOf('day').add(5, 'days');
    appointments.get(options, callback);
  }
};