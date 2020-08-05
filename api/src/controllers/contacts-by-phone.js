const db = require('../db');
const config = require('../config');
const lineage = require('@medic/lineage')(Promise, db.medic);
const phoneNumber = require('@medic/phone-number');
const serverUtils = require('../server-utils');

const invalidParameterError = (res) => {
  res.status(400);
  return res.json({ error: 'bad_request', reason: '`phone` parameter is required and must be a valid phone number' });
};

const getPhoneNumber = (req) => {
  return (req.query && req.query.phone) || (req.body && req.body.phone);
};

module.exports = {
  request: (req, res) => {
    const phone = getPhoneNumber(req);
    if (!phone) {
      return invalidParameterError(res);
    }

    const normalizedPhone = phoneNumber.normalize(config.get(), phone);
    if (!normalizedPhone) {
      return invalidParameterError(res);
    }

    return db.medic
      .query('medic-client/contacts_by_phone', { key: normalizedPhone })
      .then(result => {
        if (!result || !result.rows || !result.rows.length) {
          res.status(404);
          return res.json({ error: 'not_found', reason: 'no matches found' });
        }

        const contactIds = result.rows.map(row => row.id);
        return lineage
          .fetchHydratedDocs(contactIds)
          .then(hydratedDocs => res.json({ ok: true, docs: hydratedDocs }));
      })
      .catch(err => serverUtils.serverError(err, req, res));
  },
};
