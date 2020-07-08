const _ = require('lodash');
const moment = require('moment');
const config = require('../config');
const logger = require('../lib/logger');
const db = require('../db');
const transitionUtils = require('./utils');
const NAME = 'update_sent_forms';

/*
 * Update sent_forms property on facilities so we can setup reminders for
 * specific forms.
 */
// to be removed this in 4.0, this is rendered useless by the updates to reminders.
// https://github.com/medic/medic/issues/5939
module.exports = {
  name: NAME,
  asynchronousOnly: true,
  deprecated: true,
  deprecatedIn: '3.7.x',
  init: () => {
    const self = module.exports;
    logger.warn(self.getDeprecationMessage());
  },
  getDeprecationMessage: () => {
    const self = module.exports;
    const deprecatedExtraInfo = 'It will be removed in next major version. '
    + 'Consider updating your configuration to disable it.';

    return transitionUtils.getDeprecationMessage(self.name, self.deprecatedIn, deprecatedExtraInfo);
  },
  filter: function(doc, info = {}) {
    const self = module.exports;
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
    return Object.assign({}, config.get('reminders'));
  },
  _hasConfig: function(doc) {
    const self = module.exports;
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
      const doc = change.doc;
      const form = doc.form;
      const reported_date = doc.reported_date;
      const clinic = doc.contact && doc.contact.parent;
      const clinicId = clinic && clinic._id;

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
  }
};
