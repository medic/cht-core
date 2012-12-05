var _ = require('underscore'),
    moment = require('moment'),
    date = require('../date'),
    config = require('../config'),
    ids = require('../lib/ids'),
    utils = require('../lib/utils'),
    i18n = require('../i18n'),
    self;

module.exports = {
    form: 'ORPT',
    requiredFields: 'related_entities.clinic !patient_identifiers',
    onMatch: function(change, callback) {
        var doc = change.doc;

        doc.patient_identifiers = doc.patient_identifiers || [];

        self.setId(doc, function() {
            var expected,
                lmp,
                weeks = Number(doc.last_menstrual_period);

            if (_.isNumber(weeks)) {
                lmp = moment(date.getDate()).startOf('day').subtract('weeks', weeks);
                expected = lmp.clone().add('weeks', 40);
                _.extend(doc, {
                    lmp_date: lmp.valueOf(),
                    expected_date: expected.valueOf()
                });
                self.scheduleReminders(doc, lmp, expected);
                self.addAcknowledgement(doc);
                callback(null, true);
            } else {
                callback(null, false);
            }
        });

    },
    setId: function(doc, callback) {
        var id = ids.generate(doc.patient_name);

        utils.getOHWRegistration(id, function(err, found) {
            if (err) {
                callback(err);
            } else if (found) {
                self.setId(doc, callback);
            } else {
                doc.patient_identifiers.push(id);
                callback();
            }
        });
    },
    addAcknowledgement: function(doc) {
        var visit = utils.findScheduledMessage(doc, 'anc_visit'),
            duration = moment.duration(visit.due - moment().valueOf());

        if (visit) {
            utils.addMessage(doc, doc.from, i18n("Thank you for registering {{patient_name}}. Patient ID is {{patient_id}}. Next ANC visit is in {{weeks}} weeks.", {
                patient_id: _.first(doc.patient_identifiers),
                patient_name: doc.patient_name,
                weeks: Math.round(duration.asWeeks())
            }));
        } else {
            utils.addMessage(doc, doc.from, i18n("Thank you for registering {{patient_name}}. Patient ID is {{patient_id}}.", {
                patient_id: _.first(doc.patient_identifiers),
                patient_name: doc.patient_name
            }));
        }
    },
    scheduleReminders: function(doc, lmp, expected) {
        var clinicName = utils.getClinicName(doc),
            now = moment(date.getDate());

        _.each(config.get('ohw_anc_reminder_schedule_weeks'), function(offset) {
            var due = lmp.clone().add('weeks', offset);
            if (due > now) {
                utils.addScheduledMessage(doc, {
                    due: due.valueOf(),
                    message: i18n('Greetings, {{clinic_name}}. {{patient_name}} is due for an ANC visit this week.', {
                        clinic_name: clinicName,
                        patient_name: doc.patient_name
                    }),
                    phone: doc.from,
                    type: 'anc_visit'
                });
            }
        });
        utils.addScheduledMessage(doc, {
            due: lmp.clone().add('weeks', config.get('ohw_miso_reminder_weeks')).valueOf(),
            message: i18n("Greetings, {{clinic_name}}. It's now {{patient_name}}'s 8th month of pregnancy. If you haven't given Miso, please distribute. Make birth plan now. Thank you!", {
                clinic_name: clinicName,
                patient_name: doc.patient_name
            }),
            phone: doc.from,
            type: 'miso_reminder'
        });
        utils.addScheduledMessage(doc, {
            due: lmp.clone().add('weeks', config.get('ohw_upcoming_delivery_weeks')).valueOf(),
            message: i18n("Greetings, {{clinic_name}}. {{patient_name}} is due to deliver soon.", {
                clinic_name: clinicName,
                patient_name: doc.patient_name
            }),
            phone: doc.from,
            type: 'upcoming_delivery'
        });
        utils.addScheduledMessage(doc, {
            due: lmp.clone().add('weeks', config.get('ohw_miso_reminder_weeks')).valueOf(),
            message: i18n("Greetings, {{clinic_name}}. Please submit the birth report for {{patient_name}}.", {
                clinic_name: clinicName,
                patient_name: doc.patient_name
            }),
            phone: doc.from,
            type: 'outcome_request'
        });
    }
};

self = module.exports;
