var couchmark = require('couchmark'),
    _ = require('underscore'),
    async = require('async'),
    path = require('path'),
    fs = require('fs'),
    date = require('../date'),
    utils = require('../lib/utils'),
    logger = require('../lib/logger'),
    config = require('../config'),
    transitions = {},
    queue;

if (!process.env.TEST_ENV) {
    _.each(config.get('transitions'), function(conf, key) {
        if (conf.disable) {
            return;
        }
        try {
            transitions[key] = require('../' + conf.load);
        } catch(e) {
            // only log exceptions
            logger.error('loading transition failed: ' + e);
        }
    });
}

/*
 * create a queue to handle the changes, calling the onMatch of the transitions
 * one by one (concurrency of 1).
 *
 * The onMatch handler should execute callback() to ignore/skip the transition
 * entirely, and callback(err) or callback(null, true) to save the transition.
 */
queue = async.queue(function(job, callback) {
    var db = job.db || require('../db'),
        audit = require('couchdb-audit').withNode(db, db.user),
        transition = job.transition,
        key = job.key,
        change = job.change;

    logger.debug(
        'calling transition.onMatch for doc %s seq %s and transition %s',
        change.id, change.seq, key
    );

    transition.onMatch(change, db, audit, function(err, complete) {
        logger.debug(
            'finished transition.onMatch for doc %s seq %s transition %s',
            change.id, change.seq, job.key
        );
        if (err || complete) {
            module.exports.finalize({
                key: key,
                change: change,
                err: err
            }, db, audit, callback);
        } else {
            callback();
        }
    });

}, 1);

module.exports = {
    // determines whether a transition is okay to run on a document
    canRun: function(transition, key, doc) {
        // repeatable and has transitions object returns true if revs don't
        // match
        if (transition.repeatable && doc.transitions && doc.transitions[key]) {
            return parseInt(doc._rev) !== doc.transitions[key].last_rev;
        // not repeatable and has transitions object
        // return by key value being ok
        } else if (!doc.repeatable && doc.transitions && doc.transitions[key]) {
            return !doc.transitions[key].ok;
        // otherwise, can run
        } else {
            return true;
        }
    },
    attachTransition: function(transition, key) {
        var db = require('../db'),
            filter,
            feed;

        if (_.isFunction(transition.filter)) {
            filter = transition.filter;
        } else {
            filter = 'kujua-sentinel/' + key;
        }

        logger.debug(
            'subscribing to changes for transition %s with filter type %s',
            key, typeof(filter)
        );

        feed = new couchmark.Feed({
            db: process.env.COUCH_URL,
            filter: filter,
            stream: key
        });

        feed.on('change', function(change) {

            // ignore documents that have been deleted; there's nothing to update
            if (change.deleted) {
                return;
            }

            logger.debug(
                'change on %s feed for doc %s sequence %s',
                key, change.id, change.seq
            );

            // get the latest document
            db.getDoc(change.id, function(err, doc) {

                if (err || !doc) {
                    return logger.error('failed to get doc: %s', err);
                }

                logger.debug(
                    'fetched doc %s for seq %s and transition %s',
                    change.id, change.seq, key
                );

                if (module.exports.canRun(transition, key, doc)) {
                    // modify reported_date if we are running in
                    // synthetic date mode
                    if (doc.reported_date && date.isSynthetic()) {
                        doc.reported_date = date.getTimestamp();
                    }

                    change.doc = doc;

                    logger.debug(
                        'loading queue for doc %s seq %s and transition %s',
                        change.id, change.seq, key
                    );

                    queue.push({
                        change: change,
                        db: db,
                        key: key,
                        transition: transition
                    });
                } else {
                    logger.debug(
                        'skipping doc %s seq %s and transition %s',
                        change.id, change.seq, key
                    );
                }
            });
        });

        feed.on('ready', function() {
            logger.info(
                'Listening to changes on transition %s and seq %s',
                key, feed.since
            );
            feed.follow();
        });
    },
    // Attach a transition to a stream of changes from the database.
    attach: function(design) {
        _.each(transitions, function(transition, key) {
            // don't attach if it doesn't have a filter
            if (!_.isFunction(transition.filter) && (!design.filters || !design.filters[key])) {
                console.warn("MISSING " + key + " filter, skipping transition!");
                return;
            }

            module.exports.attachTransition(transition, key);

        });
    },
    // mark the transition as completed
    finalize: function(options, db, audit, callback) {
        var change = options.change,
            key = options.key,
            err = options.err,
            doc = change.doc;

        _.defaults(doc, {
            transitions: {}
        });

        doc.transitions[key] = {
            ok: !err,
            last_rev: parseInt(doc._rev) + 1 // because it's the revision AFTER a save
        };

        logger.debug(
            'called finalize for doc %s seq %s transition %s',
            change.id, change.seq, key
        );

        db.getDoc(doc._id, function(err, latest) {
            if (err) {
                logger.error("Error fetching doc %s", JSON.stringify(err));
                callback(err);
            } else {
                if (utils.updateable(doc, latest)) {
                    logger.debug(
                        'calling audit.saveDoc for doc %s seq %s transition %s',
                        change.id, change.seq, key
                    );
                    audit.saveDoc(doc, function(err, result) {
                        if (err) {
                            logger.error(
                                "Error saving doc %s", JSON.stringify(err)
                            );
                        }
                        callback(err);
                    });
                } else {
                    logger.debug(
                        'skipping audit.saveDoc for doc %s seq %s transition %s',
                        change.id, change.seq, key
                    );
                    callback();
                }
            }
        });
    }
}
