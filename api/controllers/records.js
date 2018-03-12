const db = require('../db-pouch'),
      recordUtils = require('./record-utils');

const generate = (req, contentType) => {
  if (contentType === 'urlencoded') {
    const options = { locale: req.query && req.query.locale };
    return recordUtils.createByForm(req.body, options);
  }
  if (contentType === 'json') {
    return recordUtils.createRecordByJSON(req.body);
  }
};

module.exports = {
  create: (req, contentType) => {
    const doc = generate(req, contentType);
    if (!doc) {
      return Promise.reject(new Error('Content type not supported.'));
    }
    return db.medic.put(doc).then(() => ({ success: true }));
  }
};
