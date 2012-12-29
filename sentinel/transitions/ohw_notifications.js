var db,
    utils = require('../lib/utils'),
    i18n = require('../i18n');

module.exports = {
    db: require('../db'),
    onMatch: function(change, callback) {
        var doc = change.doc,
            clinicPhone = utils.getClinicPhone(doc),
            clinicName = utils.getClinicName(doc),
            self = module.exports;

        utils.getOHWRegistration(doc.patient_id, function(err, registration) {
            if (err) {
                callback(err);
            } else if (registration) {
                if (/^On$/i.test(String(doc.notifications))) {
                    utils.unmuteScheduledMessages(registration);
                    utils.addMessage(doc, {
                        phone: clinicPhone,
                        message: i18n("Thank you. Notifications for {{patient_id}} have been turned on.", {
                            patient_id: doc.patient_id
                        })
                    });
                    registration.muted = false;
                } else {
                    utils.muteScheduledMessages(registration);
                    utils.addMessage(doc, {
                        phone: clinicPhone,
                        message: i18n("Thank you. All notifications for {{patient_id}} have been turned off.", {
                            patient_id: doc.patient_id
                        })
                    });
                    registration.muted = true;
                }

                self.db.saveDoc(registration, function(err) {
                    callback(err, true);
                });
            } else if (clinicPhone) {
                utils.addMessage(doc, {
                    phone: clinicPhone,
                    message: i18n("No patient with id '{{patient_id}}' found.", {
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
