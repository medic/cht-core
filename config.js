var _ = require('underscore'),
    follow = require('follow'),
    db = require('./db'),
    logger = require('./lib/logger'),
    config = require('./defaults'),
    translations = {};

function loadTranslations() {
    var options = {
        startkey: [ 'translations', false ],
        endkey: [ 'translations', true ],
        include_docs: true
    };
    db.medic.view('medic-client', 'doc_by_type', options, function(err, result) {
        if (err) {
            logger.error('Error loading translations - starting up anyway', err);
            return;
        }
        result.rows.forEach(function(row) {
            translations[row.doc.code] = row.doc.values;
        });
    });
}

function initFeed() {
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
    initFeed();
    callback();
}

module.exports = {
    _initConfig: initConfig,
    _initFeed: initFeed,
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
    db_info: null
};
