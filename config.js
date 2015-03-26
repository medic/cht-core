var _ = require('underscore'),
    async = require('async'),
    follow = require('follow'),
    config = require('./defaults'),
    logger = require('./lib/logger');

function initInfo(callback) {
    var db = require('./db'),
        self = module.exports;

    db.medic.view('kujua-sentinel', 'last_valid_seq', {
        reduce: true
    }, function(err, data) {
        var first = data.rows.pop();
        self.last_valid_seq = (first && first.value.seq);
        callback(err);
    });
};

function initFeed(callback) {
    /*
     * Use since=now on ddoc listener so we don't replay an old change.
     */
    var feed = new follow.Feed({
        db: process.env.COUCH_URL,
        since: 'now'
    });

    feed.filter = function(doc, req) {
        return doc._id === '_design/medic';
    };

    /*
     * Hack until figure out a better way to reload app settings in all
     * the calling contexts.
     */
    feed.on('change', function(change) {
        logger.debug('change event on doc %s seq %s', change.id, change.seq);
        logger.info('reload triggered, exiting...');
        process.exit(0);
    });

    feed.follow();
    callback();
};

function initConfig(data, callback) {
    var settings = data.settings;
    // append custom translations to defaults
    if (settings.translations) {
        settings.translations = config.translations.concat(settings.translations);
    }
    // merge defaults with app settings
    _.extend(config, settings);
    logger.debug(
        'Reminder messages allowed between %s:%s and %s:%s',
        config['schedule_morning_hours'],
        config['schedule_morning_minutes'],
        config['schedule_evening_hours'],
        config['schedule_evening_minutes']
    );
    initFeed(function(err) {
        initInfo(callback);
    });
};

module.exports = {
    _initConfig: initConfig,
    _initFeed: initFeed,
    _initInfo: initInfo,
    get: function(key) {
        return config[key];
    },
    init: function(callback) {
        var db = require('./db');
        db.medic.get(config.settings_path, function(err, data) {
            if (err) {
                return callback(err);
            }
            initConfig(data, callback);
        });
    },
    db_info: null,
    last_valid_seq: null
};
