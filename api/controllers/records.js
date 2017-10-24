var recordUtils = require('./record-utils');

module.exports = {
  create: function(data, contentType, callback) {
    if (contentType === 'urlencoded') {
      return recordUtils.createByForm(data, callback);
    }
    if (contentType === 'json') {
      return recordUtils.createRecordByJSON(data, callback);
    }
    return callback(new Error('Content type not supported.'));
  }
};
