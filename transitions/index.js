var _ = require('underscore'),
    async = require('async'),
    fs = require('fs'),
    path = require('path'),
    transitions = {},
    date = require('../date'),
    utils = require('../lib/utils'),
    couchmark = require('couchmark'),
    queue;

if (!process.env.TEST_ENV) {
    // read all files in this directory and use every one except index.js as a transition
    _.each(fs.readdirSync(__dirname), function(file) {
        var transition,
        key = path.basename(file, path.extname(file));

        try {
            if (file !== 'index.js') {
                transition = require('./' + key);
                transitions[key] = transition;
            }
        } catch(e) {
            // only log exceptions
            console.error(e);
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
        audit = require('couchdb-audit').withNode('kujua-lite', db, 'sentinel'),
        transition = job.transition,
        key = job.key,
        change = job.change;

    console.log('loading queue %s', key);

    transition.onMatch(change, db, audit, function(err, complete) {
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
        // repeatable and has transitions object
        // returns true if revs don't match
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

            // get the latest document
            db.getDoc(change.id, function(err, doc) {
                if (err || !doc) {
                    return console.error('sentinel getDoc failed with error: %s', err);
                }

                if (module.exports.canRun(transition, key, doc)) {
                    // modify reported_date if we are running in
                    // synthetic date mode
                    if (doc.reported_date && date.isSynthetic()) {
                        doc.reported_date = date.getTimestamp();
                    }

                    change.doc = doc;

                    queue.push({
                        change: change,
                        db: db,
                        key: key,
                        transition: transition
                    });
                }
            });
        });

        feed.on('ready', function() {
            console.log('Listening for changes for the ' + key + ' transition from sequence number ' + feed.since);
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

        db.getDoc(doc._id, function(err, latest) {
            if (err) {
                console.log("Error fetching doc: %s", JSON.stringify(err));
                callback(err);
            } else {
                if (utils.updateable(doc, latest)) {
                    audit.saveDoc(doc, function(err, result) {
                        if (err) {
                            console.log(JSON.stringify(err));
                        }
                        callback(err);
                    });
                } else {
                    callback();
                }
            }
        });
    }
}
