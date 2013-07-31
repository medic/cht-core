var _ = require('underscore'),
    async = require('async'),
    fs = require('fs'),
    path = require('path'),
    transitions = {},
    date = require('../date'),
    utils = require('../lib/utils'),
    queue;

if (!process.env.TEST_ENV) {
    // read all files in this directory and use every one except index.js as a transition
    _.each(fs.readdirSync(__dirname), function(file) {
        var transition,
        key = path.basename(file, path.extname(file));

        console.log('reading file %s', key);
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
        transition = job.transition,
        key = job.key,
        change = job.change;

    console.log('loading queue %s', key);

    transition.onMatch(change, db, function(err, complete) {
        if (err || complete) {
            module.exports.finalize({
                key: key,
                change: change,
                err: err
            }, db, callback);
        } else {
            callback();
        }
    });
}, 1);

module.exports = {
    attachTransition: function(transition, key) {
        var db = require('../db'),
            stream;

        db.info(function(err, data) {

            if (err)
                return console.error('attachTransition failed', err);

            var since = data.update_seq;

            // get a stream of changes from the database
            stream = db.changesStream({
                since: since,
                filter: 'kujua-sentinel/' + key
            });

            stream.on('data', function(change) {
                // ignore documents that have been deleted; there's nothing to update
                if (change.deleted) {
                    return;
                }

                // get the latest document
                db.getDoc(change.id, function(err, doc) {

                    var transitions = doc.transitions || {};

                    if (err || !doc) {
                        return console.error('sentinel getDoc failed with error: %s', err);
                    }

                    if (transition.repeatable || !transitions[key] || !transitions[key].ok) {
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
            stream.on('error', function(err) {
                console.log('Changes stream error',err);
                process.exit(1);
            });
            stream.on('end', function(err) {
                console.log('Changes stream ended',err);
                process.exit(1);
            });
            console.log('Listening for changes for the ' + key + ' transition from sequence number ' + since);
        });

    },
    // Attach a transition to a stream of changes from the database.
    attach: function(design) {
        _.each(transitions, function(transition, key) {

            // don't attach if it doesn't have a filter
            if (!design.filters || !design.filters[key]) {
                console.warn("MISSING " + key + " filter, skipping transition!");
                return;
            }

            module.exports.attachTransition(transition, key);

        });
    },
    // mark the transition as completed
    finalize: function(options, db, callback) {
        var change = options.change,
            key = options.key,
            err = options.err,
            doc = change.doc;

        _.defaults(doc, {
            transitions: {}
        });

        doc.transitions[key] = {
            ok: !err
        };

        db.getDoc(doc._id, function(err, latest) {
            if (err) {
                console.log("Error fetching doc: %s", JSON.stringify(err));
                callback(err);
            } else {
                if (utils.updateable(doc, latest)) {
                    db.saveDoc(doc, function(err, result) {
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
