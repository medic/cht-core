var recordUtils = require('./record-utils');

module.exports = {
  create: function(req, contentType, callback) {
    // TODO need to save to db here now and no longer pass callback
    if (contentType === 'urlencoded') {
      const options = { locale: req.query && req.query.locale };
      return recordUtils.createByForm(req.body, options, callback);
    }
    if (contentType === 'json') {
      return recordUtils.createRecordByJSON(req.body, callback);
    }
    return callback(new Error('Content type not supported.'));
  }
};
