var _ = require('underscore'),
    moment = require('moment'),
    config = require('../config'),
    logger = require('../lib/logger');

/*
 * Update sent_forms property on facilities so we can setup reminders for
 * specific forms.
 */
module.exports = {
    filter: function(doc) {
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
            !self._hasRun(doc)
        );
    },
    _hasRun: function(doc) {
        return Boolean(
            doc &&
            doc.transitions &&
            doc.transitions.update_sent_forms
        );
    },
    _getConfig: function() {
        return _.extend({}, config.get('reminders'));
    },
    _hasConfig: function(doc) {
        var self = module.exports;
        // confirm the form is defined on a reminder config
        return _.find(self._getConfig(), function(obj) {
            return obj.form &&
                doc.form.match(new RegExp('^\\s*'+obj.form+'\\s*$','i'));
        });
    },
    onMatch: function(change, db, audit, callback) {
        var doc = change.doc,
            form = doc.form,
            reported_date = doc.reported_date,
            clinic = doc.contact && doc.contact.parent,
            clinicId = clinic && clinic._id;

        db.medic.get(clinicId, function(err, clinic) {
            var latest,
                reported = moment(reported_date);

            if (err) {
                logger.error('update_sent_forms: failed to get facility %s', err);
                return callback(err);
            }
            _.defaults(clinic, {
                sent_forms: {}
            });

            latest = clinic.sent_forms[form];

            if (!latest || moment(latest) < reported) {
                clinic.sent_forms[form] = moment(reported_date).toISOString();
            } else {
                // nothing to do here
                return callback();
            }

            audit.saveDoc(clinic, function(err) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, true);
                }
            });
        });
    }
};
