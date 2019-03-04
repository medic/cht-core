const db = require('../db'),
      auth = require('../auth'),
      serverUtils = require('../server-utils'),
      recordUtils = require('./record-utils'),
      config = require('../config');

const generate = (req, options) => {
  if (req.is('urlencoded')) {
    return recordUtils.createByForm(req.body, options);
  }
  if (req.is('json')) {
    return recordUtils.createRecordByJSON(req.body);
  }
  throw new Error('Content type not supported.');
};

const process = (req, res, options) => {
  return auth.check(req, 'can_create_records')
    .then(() => generate(req, options))
    .then(doc => config.getTransitionsLib().processDocs([doc]))
    .then(docs => db.medic.post(docs[0]))
    .then(result => res.json({ success: true, id: result.id }))
    .catch(err => serverUtils.error(err, req, res));
};

module.exports = {

  v1: (req, res) => {
    return process(req, res, { locale: req.query && req.query.locale });
  },

  // dropped support for locale because it makes no sense
  v2: (req, res) => {
    return process(req, res);
  }

};
