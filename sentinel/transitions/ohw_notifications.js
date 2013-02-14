var db,
    utils = require('../lib/utils'),
    i18n = require('../i18n'),
    mustache = require('mustache');

module.exports = {
    db: require('../db'),
    onMatch: function(change, callback) {
        var doc = change.doc,
            clinicPhone = utils.getClinicPhone(doc),
            clinicName = utils.getClinicName(doc),
            self = module.exports;

        utils.getOHWRegistration(doc.patient_id, function(err, registration) {
            var mute,
                msg = "No patient with id '{{patient_id}}' found.";

            if (err) return callback(err);

            if (!registration) {
                if (clinicPhone) {
                    utils.addMessage(doc, {
                        phone: clinicPhone,
                        message: i18n(msg, { patient_id: doc.patient_id })
                    });
                }
                utils.addError(doc, {
                    message: mustache.to_html(msg, { patient_id: doc.patient_id })
                });
                return callback(null, true);
            }

            mute = !/^On$/i.test(String(doc.notifications));

            if (mute) {
                utils.muteScheduledMessages(registration);
                utils.addMessage(doc, {
                    phone: clinicPhone,
                    message: i18n("Thank you. All notifications for {{patient_id}} have been turned off.", {
                        patient_id: doc.patient_id
                    })
                });
            } else {
                utils.unmuteScheduledMessages(registration);
                utils.addMessage(doc, {
                    phone: clinicPhone,
                    message: i18n("Thank you. Notifications for {{patient_id}} have been turned on.", {
                        patient_id: doc.patient_id
                    })
                });
            }

            registration.muted = mute;

            self.db.saveDoc(registration, function(err) {
                callback(err, true);
            });

        });
    }
};
