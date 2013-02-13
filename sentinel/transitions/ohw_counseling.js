var config = require('../config'),
    i18n = require('../i18n'),
    date = require('../date'),
    moment = require('moment'),
    utils = require('../lib/utils');

module.exports = {
    db: require('../db'),
    onMatch: function(change, callback) {
        var doc = change.doc,
            self = module.exports,
            clinicContactName = utils.getClinicContactName(doc),
            clinicPhone = utils.getClinicPhone(doc);

        var msgs = {

            not_found: "No patient with id '{{patient_id}}' found.",

            default: "Thank you, {{contact_name}}. Counseling visit for"
                + " {{serial_number}} has been recorded. Please complete"
                + " necessary protocol.",

            pnc_low: "Thank you, {{contact_name}}! PNC Visit has been"
                + " recorded for {{serial_number}}. The baby is of low"
                + " birth weight. Please refer to health facility"
                + " immediately.",

            pnc_normal: 'Thank you, {{contact_name}}! PNC Visit has been'
                + ' recorded for {{serial_number}}.',

            anc: "Thank you, {{contact_name}}. ANC Visit for {{serial_number}}"
                + " has been recorded."

        };

        utils.getOHWRegistration(doc.patient_id, function(err, registration) {

            if (err)
                return callback(err);

            if (!registration) {
                if (clinicPhone) {
                    utils.addMessage(doc, {
                        phone: clinicPhone,
                        message: i18n(msgs.not_found, {
                            patient_id: doc.patient_id
                        })
                    });
                }
                utils.addError(doc, {
                    message: i18n(msgs.not_found, {patient_id: doc.patient_id})
                });
                return callback(null, true);
            }

            var msg = msgs.default;

            if (doc.anc_pnc === 'PNC') {

                if (doc.weight === 'Green')
                    msg = msgs.pnc_normal;
                if (doc.weight === 'Yellow' || doc.weight === 'Red')
                    msg = msgs.pnc_low;

                var changed = utils.obsoleteScheduledMessages(
                    registration, 'counseling_reminder', doc.reported_date
                );

            } else if (doc.anc_pnc === 'ANC') {
                utils.obsoleteScheduledMessages(
                    registration, 'anc_visit', doc.reported_date
                );
                msg = msgs.anc;
            }

            utils.addMessage(doc, {
                phone: clinicPhone,
                message: i18n(msg, {
                    contact_name: clinicContactName,
                    serial_number: registration.serial_number
                })
            });

            self.db.saveDoc(registration, function(err) {
                return callback(err, true);
            });

        });

    }
};
