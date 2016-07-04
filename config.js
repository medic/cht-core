var _ = require('underscore'),
    follow = require('follow'),
    db = require('./db'),
    logger = require('./lib/logger'),
    config = require('./defaults'),
    translations = {};

function initInfo(callback) {
    var db = require('./db'),
        self = module.exports;

    db.medic.view('kujua-sentinel', 'last_valid_seq', {
        reduce: true
    }, function(err, data) {
        if (err) {
            logger.info('Error getting last_valid_seq', err);
            return callback(err);
        }
        var first = data.rows.pop();
        self.last_valid_seq = (first && first.value.seq);
        callback();
    });
}

function loadTranslations() {
    var options = { key: [ 'translations' ], include_docs: true };
    db.medic.view('medic', 'doc_by_type', options, function(err, result) {
        if (err) {
            logger.error('Error loading translations - starting up anyway', err);
            return;
        }
        result.rows.forEach(function(row) {
            translations[row.doc.code] = row.doc.values;
        });
    });
}

function initFeed(callback) {
    /*
     * Use since=now on ddoc listener so we don't replay an old change.
     */
    var feed = new follow.Feed({ db: process.env.COUCH_URL, since: 'now' });

    /*
     * Hack until figure out a better way to reload app settings in all
     * the calling contexts.
     */
    feed.on('change', function(change) {
        if (change.id === '_design/medic') {
            logger.debug('change event on doc %s seq %s', change.id, change.seq);
            logger.info('reload triggered, exiting...');
            process.exit(0);
        } else if (change.id.indexOf('messages-') === 0) {
            logger.info('Detected translations change - reloading');
            loadTranslations();
        }
    });

    feed.follow();
    callback();
}

function initConfig(data, callback) {
    var settings = data.settings;
    // merge defaults with app settings
    _.extend(config, settings);
    logger.debug(
        'Reminder messages allowed between %s:%s and %s:%s',
        config.schedule_morning_hours,
        config.schedule_morning_minutes,
        config.schedule_evening_hours,
        config.schedule_evening_minutes
    );
    initFeed(function() {
        initInfo(callback);
    });
}

module.exports = {
    _initConfig: initConfig,
    _initFeed: initFeed,
    _initInfo: initInfo,
    get: function(key) {
        return config[key];
    },
    getTranslations: function() {
        return translations;
    },
    init: function(callback) {
        db.medic.get(config.settings_path, function(err, data) {
            if (err) {
                return callback(err);
            }
            initConfig(data, callback);
        });
        loadTranslations();
    },
    db_info: null,
    last_valid_seq: null
};
