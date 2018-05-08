const db = require('../db-pouch'),
      recordUtils = require('./record-utils');

const generate = (req, contentType) => {
  if (contentType === 'urlencoded') {
    return recordUtils.createByForm(req.body);
  }
  if (contentType === 'json') {
    return recordUtils.createRecordByJSON(req.body);
  }
  throw new Error('Content type not supported.');
};

module.exports = {
  create: (req, contentType) => {
    return Promise.resolve()
      .then(() => generate(req, contentType))
      .then(doc => db.medic.post(doc))
      .then(() => ({ success: true }));
  }
};
