var _ = require('underscore'),
    follow = require('follow'),
    async = require('async'),
    path = require('path'),
    fs = require('fs'),
    date = require('../date'),
    utils = require('../lib/utils'),
    logger = require('../lib/logger'),
    config = require('../config'),
    transitions = {};

if (!process.env.TEST_ENV) {
    _.each(config.get('transitions'), function(conf, key) {
        if (conf.disable) {
            return;
        }
        try {
            transitions[key] = require('../' + conf.load);
        } catch(e) {
            // log exception and exit
            logger.error(e);
            process.exit();
        }
    });
}

module.exports = {
    /*
     * Determines whether a transition is okay to run on a document.
     * Removed repeatable logic, assuming all transitions are repeatable
     * without adverse effects.
     */
    canRun: function(options) {
        var key = options.key,
            change = options.change,
            doc = change.doc,
            transition = options.transition;

        var _isRevSame = function() {
            if (doc.transitions && doc.transitions[key]) {
                return parseInt(doc._rev) === parseInt(doc.transitions[key].last_rev);
            }
        };

        /*
         * Ignore deleted records, confirm transition has filter function and
         * skip transition if filter returns false.
         *
         * If transition was already applied then only run again if doc rev is
         * not equal to transtion rev.
         */
        return Boolean(
            doc &&
            options &&
            options.change &&
            !options.change.deleted &&
            transition &&
            typeof transition.filter === 'function' &&
            transition.filter(doc) &&
            !_isRevSame()
        );
    },
    /*
     * Get results from transitions and save the doc if we have changes.
     * Otherwise transitions did nothing and saving is unnecessary.  If results
     * has a true value in it then a change was made. If transition gives an
     * error then we abort processing this change.
     */
    finalize: function(options) {
        var change = options.change,
            audit = options.audit,
            err = options.err,
            results = options.results;
        logger.debug(
            'transition results: %s', JSON.stringify(results)
        );
        if (err) {
            return logger.error(
                'transition error, skipping save for doc %s seq %s: %s',
                change.id, change.seq, JSON.stringify(err)
            );
        }
        var changed = _.some(results, function(i) {
            return Boolean(i);
        });
        if (changed) {
            logger.debug(
                'calling audit.saveDoc on doc %s seq %s',
                change.id, change.seq
            );
            audit.saveDoc(change.doc, function(err) {
                // todo: how to handle a failed save? for now just
                // waiting until next change and try again.
                if (err) {
                    logger.error(
                        'error saving changes on doc %s seq %s: %s',
                        change.id, change.seq, JSON.stringify(err)
                    );
                } else {
                    logger.info(
                        'saved changes on doc %s seq %s',
                        change.id, change.seq
                    );
                }
            });
        } else {
            logger.debug(
                'nothing changed skipping audit.saveDoc for doc %s seq %s',
                change.id, change.seq
            );
        }
    },
    /*
     * All transitions reference the same change.doc and work in series to
     * apply changes to it.
     */
    applyTransition: function(options, callback) {

        var key = options.key,
            change = options.change,
            transition = options.transition,
            audit = options.audit,
            db = options.db;

        function _setProperty(property, value) {
            var doc = change.doc;
            if (!doc.transitions) {
                doc.transitions = {};
            }
            if (!doc.transitions[key]) {
                doc.transitions[key] = {};
            }
            doc.transitions[key][property] = value;
        }

        logger.debug(
            'calling transition.onMatch for doc %s seq %s and transition %s',
            change.id, change.seq, key
        );

        /*
         * Transitions are async and should return true if the document
         * should be saved. If a transition errors the error is returned
         * immediately.
         */
        transition.onMatch(change, db, audit, function(err, changed) {
            logger.debug(
                'finished transition for doc %s seq %s transition %s',
                change.id, change.seq, key
            );
            if (err || !changed) {
                return callback(err);
            }
            // todo?
            // prop = doc.transitions && doc.transitions[key] ? doc.transitions[key] : {};
            //_setProperty('tries', prop.tries ? prop.tries++ : 1)
            //_setProperty('couch', 'uuid');
            //
            _setProperty('last_rev', parseInt(change.doc._rev) + 1);
            _setProperty('seq', change.seq);
            _setProperty('ok', !err);
            callback(err, changed);
        });
    },
    attach: function(design) {
        var db = require('../db'),
            audit = require('couchdb-audit').withNode(db, db.user);

        var match_types = [
            'data_record',
            'clinic',
            'health_center',
            'district'
        ];

        var feed = new follow.Feed({
            db: process.env.COUCH_URL,
            include_docs: true,
            // defaults to run transitions on last 50 changes on startup.
            since: config.db_info.update_seq - 50
        });

        feed.filter = function(doc, req) {
            return match_types.indexOf(doc.type) >= 0;
        };

        feed.on('change', function(change) {

            logger.debug('change event on doc %s seq %s', change.id, change.seq);

            var operations = [];
            _.each(transitions, function(transition, key) {
                var opts = {
                    key: key,
                    change: change,
                    transition: transition,
                    audit: audit,
                    db: db
                };
                if (!module.exports.canRun(opts)) {
                    logger.debug('skipping transition %s %s', key, change.seq);
                    return;
                }
                operations.push(function(cb) {
                    applyTransition(opts, function(err, changed) {
                        /*
                         * Transition error short circuits async.series,
                         * effectively throwing away the changes.  Transition
                         * will be retried on next change event on doc.
                         */
                        if (err) {
                            logger.error(
                                'transition %s returned error doc %s seq %s: %s',
                                key, change.id, change.seq, JSON.stringify(err)
                            );
                        }
                        cb(err, changed);
                    });
                });
            });

            /*
             * Run transitions in series and finalize.
             */
            async.series(operations, function(err, results) {
                module.exports.finalize({
                    change: change,
                    audit: audit,
                    err: err,
                    results: results
                });
            });
        });

        feed.follow();

    }
}
