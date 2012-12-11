var config = require('../config'),
    i18n = require('../i18n'),
    date = require('../date'),
    moment = require('moment'),
    utils = require('../lib/utils');

module.exports = {
    db: require('../db'),
    onMatch: function(change, callback) {
        var clinicName,
            clinicPhone,
            doc = change.doc,
            self = module.exports;

        clinicPhone = utils.getClinicPhone(doc);
        clinicName = utils.getClinicName(doc);
        utils.getOHWRegistration(doc.patient_id, function(err, registration) {
            var changed,
                horizon = moment(date.getDate()).add('days', config.get('ohw_obsolete_anc_reminders_days'));

            if (err) {
                callback(err);
            } else if (registration) {
                utils.addMessage(doc, {
                    phone: clinicPhone,
                    message: i18n("Thank you, {{clinicName}}. ANC counseling visit for {{patient_id}} has been recorded.", {
                        clinicName: clinicName,
                        patient_id: doc.patient_id
                    })
                });
                changed = utils.obsoleteScheduledMessages(registration, 'anc_visit', horizon.valueOf());
                if (changed) {
                    self.db.saveDoc(registration, function(err) {
                        callback(err, true);
                    });
                } else {
                    callback(null, true);
                }
            } else if (clinicPhone) {
                utils.addMessage(doc, {
                    phone: clinicPhone,
                    messages: i18n("No patient with id '{{patient_id}}' found.", {
                        patient_id: doc.patient_id
                    })
                });
                callback(null, true);
            } else {
                callback(null, false);
            }
        });
    }
};
