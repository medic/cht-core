var i18n = require('../i18n'),
    utils = require('../lib/utils');

module.exports = {
    db: require('../db'),
    onMatch: function(change, callback) {
        var doc = change.doc,
            clinicName,
            clinicPhone;

        clinicName = utils.getClinicName(doc);
        clinicPhone = utils.getClinicPhone(doc);

        utils.getOHWRegistration(doc.patient_id, function(err, registration) {
            if (err) {
                return callback(err);
            }

            if (registration) {
                utils.clearScheduledMessages(registration, 'counseling_reminder');
            } else {
                if (clinicPhone) {
                    utils.addMessage(doc, {
                        phone: clinicPhone,
                        message: i18n("No patient with id '{{patient_id}}' found.", {
                            patient_id: doc.patient_id
                        })
                    });
                }
                return callback(null, true);
            }

            callback(null, true);
        });

    }
};
