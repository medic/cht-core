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
            // log exception
            logger.error('failed loading transition %s %s', key, conf.load);
            logger.error(e);
        }
    });
}

/*
 * Determines whether a transition is okay to run on a document.  Removed
 * repeatable logic, assuming all transitions are repeatable without adverse
 * effects.
 */
var canRun = function(options) {
    var key = options.key,
        change = options.change,
        doc = change.doc,
        transition = options.transition;

    var isRevSame = function() {
        if (doc.transitions && doc.transitions[key]) {
            return parseInt(doc._rev) === parseInt(doc.transitions[key].last_rev);
        }
        return false;
    };

    /*
     * Ignore deleted records, confirm transition has filter function and
     * skip transition if filter returns false.
     *
     * If transition was already applied then only run again if doc rev is not
     * equal to transition rev.  If revs are the same then transition just ran.
     */
    return Boolean(
        doc &&
        options &&
        options.change &&
        !options.change.deleted &&
        transition &&
        typeof transition.filter === 'function' &&
        transition.filter(doc) &&
        !isRevSame()
    );
};

/*
 * Save the doc if we have changes from transitions, otherwise transitions
 * did nothing and saving is unnecessary.  If results has a true value in
 * it then a change was made.
 */
var finalize = function(options) {
    var change = options.change,
        audit = options.audit,
        results = options.results;
    logger.debug(
        'transition results: %s', JSON.stringify(results)
    );
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
};

/*
 * All transitions reference the same change.doc and work in series to
 * apply changes to it.
 */
var applyTransition = function(options, callback) {

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
     * Transitions are async and should return true if the document has
     * changed.  If a transition errors then log the error, but don't
     * return it because that will stop the series and the other
     * transitions won't run.
     */
    transition.onMatch(change, db, audit, function(err, changed) {
        logger.debug(
            'finished transition for doc %s seq %s transition %s',
            change.id, change.seq, key
        );
        // todo?
        // prop = doc.transitions && doc.transitions[key] ? doc.transitions[key] : {};
        //_setProperty('tries', prop.tries ? prop.tries++ : 1)
        //_setProperty('couch', 'uuid');
        //
        if (err || changed) {
            _setProperty('last_rev', parseInt(change.doc._rev) + 1);
            _setProperty('seq', change.seq);
            _setProperty('ok', !err);
        }
        if (err) {
            utils.addError(change.doc, {
                code: key + '_error',
                message: 'Transition error on ' + key + ': ' + JSON.stringify(err)
            });
            logger.error(
                'transition %s returned error doc %s seq %s: %s',
                key, change.id, change.seq, JSON.stringify(err)
            );
        }
        callback(err, changed);
    });
};

var applyTransitions = function(options) {
    var operations = [];
    _.each(transitions, function(transition, key) {
        var opts = {
            key: key,
            change: options.change,
            transition: transition,
            audit: options.audit,
            db: options.db
        };
        if (!canRun(opts)) {
            logger.debug(
                'not running transition %s for seq %s doc %s',
                key,
                options.change.seq,
                options.change.id
            );
            return;
        }
        /*
         * Transition error short circuits async.series, so we never
         * return errors on the callback but if there are errors we
         * save them.
         */
        operations.push(function(cb) {
            applyTransition(opts, function(err, changed) {
                cb(null, err || changed);
            });
        });
    });

    /*
     * Run transitions in series and finalize. We ignore err here
     * because it is never returned, we process it within the operation
     * function.  All we care about are results and whether we need to
     * save or not.
     */
    async.series(operations, function(err, results) {
        finalize({
            change: options.change,
            audit: options.audit,
            results: results
        });
    });
};

var attach = function() {

    var db = require('../db'),
        audit = require('couchdb-audit')
            .withNano(db, db.settings.db, db.settings.ddoc, db.settings.username);

    var match_types = [
        'data_record',
        'clinic',
        'health_center',
        'district'
    ];

    var feed = new follow.Feed({
        db: process.env.COUCH_URL,
        include_docs: true,
        // start from last valid transition ran, or the beginning of the
        // changes feed. since: 0 will re-run through all changes.
        since: config.last_valid_seq || 'now'
    });

    feed.filter = function(doc, req) {
        return match_types.indexOf(doc.type) >= 0;
    };

    feed.on('change', function(change) {
        logger.debug('change event on doc %s seq %s', change.id, change.seq);
        applyTransitions({
            change: change,
            audit: audit,
            db: db
        });
    });

    feed.follow();

    /*
     * Process changes feed docs in the past where transitions have not run or
     * transitions had errors.
     */
    db.medic.changes({
        feed: 'polling',
        since: config.last_valid_seq || 'now',
        descending: true
    }, function (err, data) {
        if (err) {
            return logger.error('backlog error: ', err);
        }
        data.results.forEach(function(change) {
            // skip design docs
            if (change.id.match(/_design/) || change.deleted) {
                return;
            }
            setTimeout(function() {
                db.medic.get(change.id, function(err, doc) {
                    if (err) {
                        return logger.error('backlog fetch failed on %s: %s', change.id, err);
                    }
                    change.doc = doc;
                    if (hasTransitionErrors(doc) || !hasTransitions(doc)) {
                        logger.debug(
                            'backlog proccessing matched on %s seq %s',
                            change.id,
                            change.seq
                        );
                        applyTransitions({
                            change: change,
                            audit: audit,
                            db: db
                        });
                    } else {
                        logger.debug(
                            'backlog processing skipped on %s seq %s',
                            change.id,
                            change.seq
                        );
                    }
                });
            }, 500);
        });
    });
};

var hasTransitions = function(doc) {
    return Object.keys(doc.transitions || {}).length > 0;
};

var hasTransitionErrors = function(doc) {
    var transitions = doc.transitions || {},
        keys = Object.keys(transitions);
    for (var key in transitions) {
        if (!transitions[key].ok) {
            return true;
        }
    }
};

module.exports = {
    canRun: canRun,
    attach: attach,
    finalize: finalize,
    applyTransition: applyTransition,
    applyTransitions: applyTransitions
}
