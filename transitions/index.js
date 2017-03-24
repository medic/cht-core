/*
 * Transitions runner.  Set up the changes listener and apply each transition
 * serially to a change.
 */

var _ = require('underscore'),
    follow = require('follow'),
    async = require('async'),
    utils = require('../lib/utils'),
    logger = require('../lib/logger'),
    config = require('../config'),
    db = require('../db'),
    PROCESSING_DELAY = 50, // ms
    PROGRESS_REPORT_INTERVAL = 500, // items
    transitions = {};

/*
 * Add new transitions here to make them available for configuration.  For
 * security reasons, we want to avoid doing a `require` based on random input,
 * hence we maintain this index of transitions.
 */
var AVAILABLE_TRANSITIONS = [
    'accept_patient_reports',
    'conditional_alerts',
    'default_responses',
    'update_sent_by',
    'resolve_pending',
    'registration',
    'update_clinics',
    'update_notifications',
    'update_scheduled_reports',
    'update_sent_forms',
    'generate_patient_id_on_patients'
];

var METADATA_DOCUMENT = 'sentinel-meta-data';

var processed = 0;

var changeQueue = async.queue(function(task, callback) {
    processChange(task, function() {
        _.delay(callback, PROCESSING_DELAY);
    });
});

var processChange = function(change, callback) {
    if (!change) {
        return callback();
    }
    var id = change.id;
    db.medic.get(id, function(err, doc) {
        if (err) {
            logger.error('transitions: fetch failed for %s (%s)', id, err);
            return callback();
        }

        if (processed > 0 && (processed % PROGRESS_REPORT_INTERVAL) === 0) {
            logger.info('transitions: %d items processed', processed);
        }
        change.doc = doc;
        logger.debug('change event on doc %s seq %s', change.id, change.seq);
        var audit = require('couchdb-audit')
                .withNano(db, db.settings.db, db.settings.auditDb, db.settings.ddoc, db.settings.username);
        module.exports.applyTransitions({
            change: change,
            audit: audit,
            db: db
        }, function() {
            processed++;
            updateMetaData(change.seq, callback);
        });
    });
};

/*
 * Load transitions using `require` based on what is in AVAILABLE_TRANSITIONS
 * constant and what is enabled in the `transitions` property in the settings
 * data.  Log warnings on failure.
 */
var loadTransitions = function() {
  var self = module.exports;
  _.each(config.get('transitions'), function(conf, key) {
      if (!conf || conf.disable) {
          logger.warn('transition %s is disabled', key);
          return;
      }
      if (AVAILABLE_TRANSITIONS.indexOf(key) === -1) {
          logger.warn('transition %s not available.', key);
          return;
      }
      self._loadTransition(key);
  });
};

var loadTransition = function(key) {
  try {
      logger.info('loading transition %s', key);
      transitions[key] = require('./' + key);
  } catch(e) {
      logger.error('failed loading transition %s', key);
      logger.error(e);
  }
};

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
        logger.debug(
            'isRevSame tested true on transition %s for seq %s doc %s',
            key,
            change.seq,
            change.id
        );
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
var finalize = function(options, callback) {
    var change = options.change,
        audit = options.audit,
        results = options.results;
    logger.debug(
        'transition results: %s', JSON.stringify(results)
    );
    var changed = _.some(results, function(i) {
        return Boolean(i);
    });
    if (!changed) {
        logger.debug(
            'nothing changed skipping audit.saveDoc for doc %s seq %s',
            change.id, change.seq
        );
        return callback();
    }
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
        return callback();
    });
};

/*
 * All transitions reference the same change.doc and work in series to
 * apply changes to it.  A transition is free to make async calls but the next
 * transition will only run after the previous transitions's callback is
 * called.  This is a performance optimization that allows us to apply N
 * transitions (updates) to a document with the cost of a single database
 * change/write.
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
     * changed.  If a transition errors then log the error, but don't return it
     * because that will stop the series and the other transitions won't run.
     */
    transition.onMatch(change, db, audit, function(err, changed) {
        logger.debug(
            'finished transition %s for seq %s doc %s is %s',
            key, change.seq, change.id, changed ? 'changed' : 'unchanged'
        );
        if (changed) {
            _setProperty('last_rev', parseInt(change.doc._rev) + 1);
            _setProperty('seq', change.seq);
            _setProperty('ok', !err);
        }
        if (err) {
            // adds an error to the doc but it will only get saved if there are
            // other changes too.
            utils.addError(change.doc, {
                code: key + '_error',
                message: 'Transition error on ' + key + ': ' +
                    err.message ? err.message: JSON.stringify(err)
            });
            logger.error(
                'transition %s errored on doc %s seq %s: %s',
                key, change.id, change.seq, JSON.stringify(err)
            );
        }
        callback(null, changed);
    });
};

var applyTransitions = function(options, callback) {
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
                'canRun test failed on transition %s for seq %s doc %s',
                key,
                options.change.seq,
                options.change.id
            );
            return;
        }
        operations.push(function(cb) {
            applyTransition(opts, cb);
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
        }, callback);
    });
};

var getMetaData = function(callback) {
    db.medic.get(METADATA_DOCUMENT, function(err, doc) {
        if (err) {
            if (err.statusCode !== 404) {
                return callback(err);
            }
            doc = {
                _id: METADATA_DOCUMENT,
                processed_seq: 0
            };
        }
        callback(null, doc);
    });
};

var getProcessedSeq = function(callback) {
    getMetaData(function(err, doc) {
        if (err) {
            logger.error('Error getting meta data', err);
            return callback(err);
        }
        callback(null, doc.processed_seq);
    });
};

var updateMetaData = function(seq, callback) {
    getMetaData(function(err, metaData) {
        if (err) {
            logger.error('Error updating metaData', err);
            return callback();
        }
        metaData.processed_seq = seq;
        db.medic.insert(metaData, function(err) {
            if (err) {
                logger.error('Error updating metaData', err);
            }
            return callback();
        });
    });
};

/*
 *  Setup changes feed listener.
 */
var attach = function() {

    // tell everyone we're here
    logger.info('transitions: processing enabled');

    getProcessedSeq(function(err, processedSeq) {
        if (err) {
            logger.error('transitions: error fetching processed seq', err);
            return;
        }
        logger.info('transitions: fetching changes feed, starting from %s', processedSeq);
        var feed = new follow.Feed({
            db: process.env.COUCH_URL,
            since: processedSeq
        });
        feed.on('change', function(change) {
            // skip uninteresting documents
            if (change.deleted ||
                    change.id.match(/^_design\//) ||
                    change.id === METADATA_DOCUMENT) {

                return;
            }
            changeQueue.push(change);
        });
        feed.follow();
    });
};

module.exports = {
    _loadTransition: loadTransition,
    _changeQueue: changeQueue,
    loadTransitions: loadTransitions,
    canRun: canRun,
    attach: attach,
    finalize: finalize,
    applyTransition: applyTransition,
    applyTransitions: applyTransitions
};

if (!process.env.TEST_ENV) {
    loadTransitions();
}
