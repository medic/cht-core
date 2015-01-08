var _ = require('underscore'),
    async = require('async'),
    follow = require('follow'),
    config = require('./defaults'),
    logger = require('./lib/logger');

function initInfo(callback) {
    var db = require('./db'),
        self = module.exports;
    async.series([
        function(cb) {
            db.config(function(err, res) {
                self.couchdb = res.couchdb;
                cb(err);
            });
        },
        function(cb) {
            db.info(function(err, info) {
                self.db_info = info;
                cb(err);
            });
        },
        function(cb) {
            db.view('kujua-sentinel', 'last_valid_seq', {
                reduce: true
            }, function(err, data) {
                var first = data.rows.pop();
                self.last_valid_seq = (first && first.value.seq);
                cb(err);
            });
        }
    ], callback);
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

function initConfig(callback) {
    var db = require('./db');

    db.request({
        method:'GET',
        path: config.settings_path
    }, function(err, data) {
        if (err) {
            return callback(err);
        }
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
        initFeed(function(err) {
            initInfo(callback);
        });
    });
};

module.exports = {
    get: function(key) {
        return config[key];
    },
    init: initConfig,
    db_info: null,
    couchdb: null,
    last_valid_seq: null
};
