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
    attach: function(design) {
        var db = require('../db'),
            audit = require('couchdb-audit').withNode(db, db.user),
            stream = 'all_docs';

        var feed = new couchmark.Feed({
            db: process.env.COUCH_URL,
            include_docs: true,
            stream: stream
        });

        var applyTransition = function(options, callback) {

            var key = options.key,
                change = options.change,
                transition = options.transition;

            logger.debug(
                'calling transition.onMatch for doc %s seq %s and transition %s',
                change.id, change.seq, key
            );

            // transitions are async and should return a doc if the document
            // was modified.
            transition.onMatch(change, db, audit, function(err, doc) {
                logger.debug(
                    'finished transition for doc %s seq %s transition %s',
                    change.id, change.seq, key
                );
                if (err) {
                    return callback(err);
                }
                if (!_.isObject(doc)) {
                    return callback('transition returned doc that is not an object');
                }
                doc = doc || change.doc;
                //console.log('doc', JSON.stringify(doc,null,2));
                _.defaults(doc, {
                    transitions: {}
                });
                // mark transitions as finished including error state
                doc.transitions[key] = {
                    ok: !err,
                    last_rev: parseInt(doc._rev) + 1 // because it's the revision AFTER a save
                };
                // triggers next transition in queue
                callback();
            });
        }

        var queue = async.queue(function(task, callback){
            var change = task.change;
            logger.debug('task: ', JSON.stringify(task,null,2));
            if (task.transition) {
                applyTransition(task, callback);
            } else {
                logger.debug(
                    'calling audit.saveDoc for doc %s seq %s transition %s',
                    change.id, change.seq, task.key
                );
                audit.saveDoc(change.doc, callback);
            }
        }, 1);

        feed.on('change', function(change) {

            // ignore documents that have been deleted; there's nothing to update
            if (change.deleted) {
                return;
            }

            logger.debug(
                'change on %s feed for doc %s sequence %s',
                stream, change.id, change.seq
            );

            // push transitions onto queue
            _.each(transitions, function(transition, key) {
                queue.push({
                    change: change,
                    transition: transition,
                    key: key
                }, function(err) {
                    if (err) {
                        logger.error(
                            'transition for doc %s seq %s transition %s returned error %s',
                            change.id, change.seq, key, JSON.stringify(err)
                        );
                    }
                });
            });

            // push save onto queue
            queue.push({
                change: change
            }, function(err) {
                if (err) {
                    logger.error(
                        "Error saving doc %s", JSON.stringify(err)
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
