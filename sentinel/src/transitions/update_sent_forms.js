var _ = require('underscore'),
  moment = require('moment'),
  config = require('../config'),
  logger = require('../lib/logger'),
  db = require('../db-pouch'),
  transitionUtils = require('./utils'),
  NAME = 'update_sent_forms';

/*
 * Update sent_forms property on facilities so we can setup reminders for
 * specific forms.
 */
module.exports = {
  filter: function(doc, info = {}) {
    var self = module.exports;
    return Boolean(
      doc &&
        doc.form &&
        doc.reported_date &&
        doc.contact &&
        doc.contact.parent &&
        doc.contact.parent._id &&
        doc.type === 'data_record' &&
        self._hasConfig(doc) &&
        !transitionUtils.hasRun(info, NAME)
    );
  },
  _getConfig: function() {
    return _.extend({}, config.get('reminders'));
  },
  _hasConfig: function(doc) {
    var self = module.exports;
    // confirm the form is defined on a reminder config
    return _.find(self._getConfig(), function(obj) {
      return (
        obj.form &&
        doc.form.match(new RegExp('^\\s*' + obj.form + '\\s*$', 'i'))
      );
    });
  },
  onMatch: change => {
    return new Promise((resolve, reject) => {
      var doc = change.doc,
        form = doc.form,
        reported_date = doc.reported_date,
        clinic = doc.contact && doc.contact.parent,
        clinicId = clinic && clinic._id;

      db.medic.get(clinicId, function(err, clinic) {
        if (err) {
          logger.error('update_sent_forms: failed to get facility: %o', err);
          return reject(err);
        }
        _.defaults(clinic, {
          sent_forms: {},
        });

        const latest = clinic.sent_forms[form];
        const reported = moment(reported_date);

        if (!latest || moment(latest) < reported) {
          clinic.sent_forms[form] = moment(reported_date).toISOString();
        } else {
          // nothing to do here
          return resolve();
        }

        db.medic.put(clinic, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(true);
          }
        });
      });
    });
  },
};
