var _ = require('underscore'),
    config = require('./defaults'),
    logger = require('./lib/logger');

function reload() {
    /*
     * Hack until figure out a better way to reload config data in all the
     * calling contexts.  Added 2 sec wait so gardener doesn't think the
     * process is broken and exits.  This also means we are processing docs
     * with an old config for a few seconds.
     */
    setTimeout(function() {
        process.exit(0);
    }, 2000);
};

function setupListener() {
    var db = require('./db');

    db.info(function(err, info) {
        var stream;

        if (err) {
            console.error("Could not attach changes stream: " + JSON.stringify(err));
            process.exit(1);
        } else {
            stream = db.changesStream({
                filter: 'kujua-sentinel/config_docs',
                since: info.update_seq
            });
            stream.on('data', function(change) {
                if (change.id) {
                    console.log("Configuration change: ", change.id);
                    console.log("restarting process...");
                    reload();
                } else {
                    console.warn("Unable to update configuration due to: " + JSON.stringify(change));
                }
            });
            stream.on('error', function(err) {
                console.log('Changes stream error',err);
                process.exit(1);
            });
            stream.on('end', function(err) {
                console.log('Changes stream ended',err);
                process.exit(1);
            });
        }
    });
};

function fetchConfig(callback) {
    var db = require('./db');

    db.request({
        method:'GET',
        path: config.settings_path
    }, function(err, data) {
        if (err) {
            callback(err);
        } else {
            var settings = data.settings;
            // append custom translations to defaults
            if (settings.translations) {
                settings.translations = config.translations.concat(settings.translations);
            }
            _.extend(config, settings);
            logger.debug(
                'Reminder messages allowed between %s:%s and %s:%s',
                config['schedule_morning_hours'],
                config['schedule_morning_minutes'],
                config['schedule_evening_hours'],
                config['schedule_evening_minutes']
            );
            callback();
        }
    });
};

module.exports = {
    get: function(key) {
        return config[key];
    },
    load: fetchConfig,
    listen: setupListener
};
