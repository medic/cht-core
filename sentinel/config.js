var config,
    db = require('./db'),
    key = 'sentinel-configuration',
    _ = require('underscore');

config = {
    ohw_anc_reminder_schedule_weeks: [16, 24, 32, 36],
    ohw_miso_reminder_weeks: 32,
    ohw_upcoming_delivery_weeks: 37,
    ohw_outcome_request_weeks: 41,
    ohw_pnc_schedule_days: [1, 3, 7],
    ohw_low_weight_pnc_schedule_days: [1, 2, 3, 4, 5, 6, 7],
    ohw_obsolete_anc_reminders_days: 21,
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
