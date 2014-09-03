var utils = require('./utils');

module.exports = {
  get: function(options, callback) {
    utils.getBirthPatientIds(options, function(err, patientIds) {
      if (err) {
        return callback(err);
      }
      callback(null, { count: patientIds.length });
    });
  }
};
