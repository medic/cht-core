var _ = require('underscore'),
    config = require('../config'),
    date = require('../date'),
    i18n = require('../i18n'),
    moment = require('moment'),
    utils = require('../lib/utils');

module.exports = {
    filter: function(doc, req) {
        // run the transition if there's a task_regimes array
        return Array.isArray(doc.task_regimes) && doc.task_regimes.some(function(regime) {
            // and *any* of the strings in it aren't in the list of scheduled_tasks
            return !doc.scheduled_tasks || (Array.isArray(doc.scheduled_tasks) && doc.scheduled_tasks.every(function(task) {
                return task.type !== regime;
            }));
        });
    },
    onMatch: function(change, db, callback) {
        callback(null, true);
    },
    getOffset: function(offset) {
        var tokens = (offset || '').split(' '),
            value = tokens[0],
            unit = tokens[1];

        if (/\d+/.test(value) && /(second|minute|hour|day|week|month|year)s?/.test(unit)) {
            return moment.duration(Number(value), unit);
        } else {
            return false;
        }
    },
    getRegime: function(key) {
        var regimes = config.get('scheduled_reminder_regimes');

        return _.find(regimes, function(regime) {
            return regime.key === key;
        });
    },
    addRegime: function(doc, key) {
        var regime = module.exports.getRegime(key),
            docStart,
            start,
            clinicContactName = utils.getClinicContactName(doc),
            clinicName = utils.getClinicName(doc),
            now = moment(date.getDate());

            // if we  can't find the regime in config, we're done
        if (!_.isObject(regime)) {
            return false;
        }

        docStart = doc[regime.start_from];

        // if the document does not have the `start_from` property (or its falsey) do nothing; this
        // will be rerun on next document change
        if (!docStart) {
            return false;
        }

        start = moment(docStart);

        _.each(regime.messages, function(msg) {
            var due,
                offset = module.exports.getOffset(msg.offset);

            if (offset) {
                due = start.clone().add(offset).valueOf();
                utils.addScheduledMessage(doc, {
                    due: due,
                    message: i18n(msg.message, {
                        clinic_name: clinicName,
                        contact_name: clinicContactName,
                        patient_id: doc.patient_id,
                        serial_number: doc.serial_number
                    }),
                    group: msg.group,
                    phone: doc.from,
                    type: key
                });
            } else {
                // bad offset, skip this msg
                console.log("%s cannot be parsed as a valid offset. Skipping this msg of %s regime.", msg.offset, key);
            }
        });
    }
};
