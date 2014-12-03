var couchmark = require('couchmark'),
    _ = require('underscore'),
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
            // only log exceptions
            logger.error(e);
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
                return parseInt(doc._rev) === doc.transitions[key].last_rev;
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
    attach: function(design) {
        var db = require('../db'),
            audit = require('couchdb-audit').withNode(db, db.user),
            stream = 'all_docs';

        var feed = new couchmark.Feed({
            db: process.env.COUCH_URL,
            include_docs: true,
            stream: stream
        });

        /*
         * All transitions reference the same change.doc and work in series to
         * apply changes to it.
         */
        var applyTransition = function(options, callback) {

            var key = options.key,
                change = options.change,
                transition = options.transition;

            logger.debug(
                'calling transition.onMatch for doc %s seq %s and transition %s',
                change.id, change.seq, key
            );

            /*
             * Transitions are async and should return true if the document was
             * modified.
             */
            transition.onMatch(change, db, audit, function(err, changed) {
                logger.debug(
                    'finished transition for doc %s seq %s transition %s',
                    change.id, change.seq, key
                );
                if (err || !changed) {
                    return callback(err);
                }
                var doc = change.doc;
                //console.log('doc', JSON.stringify(doc,null,2));
                _.defaults(doc, {
                    transitions: {}
                });
                // mark transitions as finished including error state
                doc.transitions[key] = {
                    ok: !err,
                    last_rev: parseInt(doc._rev) + 1 // because it's the revision AFTER a save
                };
                callback(null, changed);
            });
        }

        /*
         * Putting all saves in a queue, not sure why but feels safer right
         * now. Letting the saves race (run in parallel) might provide a little
         * more performance, need to test a bit more.
         */
        var saveQueue = async.queue(function(options, callback) {
            audit.saveDoc(options.change.doc, callback);
        }, 1);

        feed.on('change', function(change) {

            logger.debug(
                'change on %s feed for doc %s sequence %s',
                stream, change.id, change.seq
            );

            var operations = [];
            _.each(transitions, function(transition, key) {
                var opts = {
                    key: key,
                    change: change,
                    transition: transition
                };
                if (!module.exports.canRun(opts)) {
                    logger.debug('skipping transition %s %s', key, change.seq);
                    return;
                }
                operations.push(function(cb) {
                    applyTransition(opts, function(err, changed) {
                        /*
                         * Do not short circuit async.series by transition
                         * errors, continue applying transitions.  Transition
                         * will be retried on next change event on doc.
                         */
                        if (err) {
                            logger.debug(
                                "transition returned error %s",
                                JSON.stringify(err)
                            );
                        }
                        cb(null, changed);
                    });
                });
            });

            /*
             * Run transitions in a series and save the doc if we have changes.
             * Otherwise transitions did nothing and saving is unnecessary.  If
             * results has a true value in it then a change was made.
             */
            async.series(operations, function(err, results) {
                logger.debug('series results', JSON.stringify(results));
                var changed = _.some(results, function(i) {
                    return Boolean(i);
                });
                if (changed) {
                    logger.debug(
                        'pushing to saveQueue doc %s seq %s',
                        change.id, change.seq
                    );
                    saveQueue.push({
                        change: change
                    }, function(err) {
                        if (err) {
                            logger.error(
                                "Error saving doc %s", JSON.stringify(err)
                            );
                        }
                    });
                } else {
                    logger.debug(
                        'skipping saveQueue for doc %s seq %s',
                        change.id, change.seq
                    );
                }
            });
        });

        feed.on('ready', function() {
            logger.info(
                'Listening to changes on feed %s and seq %s',
                stream, feed.since
            );
            feed.follow();
        });
    }
}
