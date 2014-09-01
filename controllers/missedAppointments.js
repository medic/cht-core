var moment = require('moment'),
    appointments = require('./appointments');

// TODO restrict to district for district admin and filters
module.exports = {
  get: function(callback) {
    var start = moment().startOf('day').subtract(23, 'days');
    var end = moment().startOf('day').subtract(14, 'days');
    appointments.get(start, end, callback);
  }
};
