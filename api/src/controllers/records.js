const db = require('../db-pouch'),
      auth = require('../auth'),
      serverUtils = require('../server-utils'),
      recordUtils = require('./record-utils'),
      lineage = require('lineage')(Promise, db.medic);

const generate = (req, options) => {
  if (req.is('urlencoded')) {
    return recordUtils.createByForm(req.body, options);
  }
  if (req.is('json')) {
    return recordUtils.createRecordByJSON(req.body);
  }
  throw new Error('Content type not supported.');
};

const resolvePhoneToExistingContact = doc => {
  if(doc.sms_message && doc.sms_message.type === 'sms_message') {
    return db.medic.query('medic-client/contacts_by_phone', {
      key: doc.sms_message.from,
      include_docs: true
    }).then((result) => {
      const contact = result && result.rows && result.rows.length && result.rows[0].doc;
      if(contact) {
        doc.contact = lineage.minifyLineage(contact);
      }
      return doc;
    });
  } else {
    return doc;
  }
};

const process = (req, res, options) => {
  return auth.check(req, 'can_create_records')
    .then(() => generate(req, options))
    .then(doc => resolvePhoneToExistingContact(doc))
    .then(doc => db.medic.post(doc))
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
