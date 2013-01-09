var config,
    db = require('./db'),
    key = 'sentinel-configuration',
    _ = require('underscore');

config = {
    ohw_reminder_schedule_days: [
        { days: 81, group: 1 },
        { days: 83, group: 1 },
        { days: 105, group: 2 },
        { days: 137, group: 2 },
        { days: 139, group: 2 },
        { days: 193, group: 3 },
        { days: 195, group: 3 },
        { days: 203, group: 3 },
        { days: 221, group: 4 },
        { days: 223, group: 4 },
        { days: 231, group: 4 }
    ],
    ohw_miso_reminder_days: [193],
    ohw_upcoming_delivery_days: [252, 273],
    ohw_outcome_request_days: [283],
    ohw_counseling_reminder_days: [
        { days: 2, group: 1},
        { days: 5, group: 1},
        { days: 6, group: 2},
        { days: 9, group: 2}
    ],
    ohw_counseling_reminder_lbw_days: [
        { days: 2, group: 1},
        { days: 5, group: 1},
        { days: 6, group: 2},
        { days: 9, group: 2},
        { days: 13, group: 3},
        { days: 20, group: 3}
    ],
    ohw_obsolete_reminders_days: 21,
    send_weekly_reminders: {
        VPD: {
            3: "Last day to submit a timely VPD report for the previous week.",
            4: "VPD report not received on time; please send previous week's data."
        }
    },
    id_format: '111111'
};

function fetchConfig(callback) {
    db.getDoc(key, function(err, doc) {
        if (err && err.error === 'not_found') {
            db.saveDoc(key, config, function() {
                fetchConfig(callback);
            });
            console.log('created config ' + key)
        } else if (err) {
            callback(err);
        } else {
            _.extend(config, doc);
            console.log('loading config ' + key);
            //console.log(JSON.stringify(config, null, 2))
            callback()
        }
    });
}

module.exports = {
    get: function(key) {
        return config[key];
    },
    load: fetchConfig
};
