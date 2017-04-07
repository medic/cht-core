/*
 * Transitions runner.  Set up the changes listener and apply each transition
 * serially to a change.
 */

const _ = require('underscore'),
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
const AVAILABLE_TRANSITIONS = [
  'accept_patient_reports',
  'conditional_alerts',
  'default_responses',
  'maintain_info_document',
  'update_sent_by',
  'resolve_pending',
  'registration',
  'update_clinics',
  'update_notifications',
  'update_scheduled_reports',
  'update_sent_forms',
  'generate_patient_id_on_people'
];

const METADATA_DOCUMENT = 'sentinel-meta-data';

let processed = 0;

const changeQueue = async.queue((task, callback) =>
  processChange(task, () => _.delay(callback, PROCESSING_DELAY)));

const processChange = (change, callback) => {
  if (!change) {
    return callback();
  }
  db.medic.get(change.id, (err, doc) => {
    if (err) {
      logger.error(`transitions: fetch failed for ${change.id} (${err})`);
      return callback();
    }

    if (processed > 0 && (processed % PROGRESS_REPORT_INTERVAL) === 0) {
      logger.info(`transitions: ${processed} items processed (since sentinel started)`);
    }
    change.doc = doc;
    logger.debug(`change event on doc ${change.id} seq ${change.seq}`);
    const audit = require('couchdb-audit')
          .withNano(db, db.settings.db, db.settings.auditDb, db.settings.ddoc, db.settings.username);
    module.exports.applyTransitions({
      change: change,
      audit: audit,
      db: db
    }, () => {
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
const loadTransitions = () => {
  const self = module.exports;
  const configuredTransitions = config.get('transitions') || [];
  _.each(configuredTransitions, (conf, key) => {
    if (!conf || conf.disable) {
      return logger.warn(`transition ${key} is disabled`);
    }
    if (AVAILABLE_TRANSITIONS.indexOf(key) === -1) {
      return logger.warn(`transition ${key} not available.`);
    }
    self._loadTransition(key);
  });

  const confedKeys = Object.keys(configuredTransitions);
  AVAILABLE_TRANSITIONS.forEach(transition => {
    if (confedKeys.indexOf(transition) === -1) {
      logger.warn(`transition ${transition} is disabled due to lack of config`);
    }
  });
};

const loadTransition = key => {
  try {
    logger.info(`loading transition ${key}`);
    transitions[key] = require('./' + key);
  } catch(e) {
    logger.error(`failed loading transition ${key}`);
    logger.error(e);
  }
};

/*
 * Determines whether a transition is okay to run on a document.  Removed
 * repeatable logic, assuming all transitions are repeatable without adverse
 * effects.
 */
const canRun = options => {
  const key = options.key,
        change = options.change,
        doc = change.doc,
        transition = options.transition;

  const isRevSame = () => {
    if (doc.transitions && doc.transitions[key]) {
      return parseInt(doc._rev) === parseInt(doc.transitions[key].last_rev);
    }
    logger.debug(`isRevSame tested true on transition ${key} for seq ${change.seq} doc ${change.id}`);
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
const finalize = (options, callback) => {
  const change = options.change,
        audit = options.audit,
        results = options.results;

  logger.debug(`transition results: ${JSON.stringify(results)}`);

  const changed = _.some(results, i => Boolean(i));
  if (!changed) {
    logger.debug(
      `nothing changed skipping audit.saveDoc for doc ${change.id} seq ${change.seq}`);
    return callback();
  }
  logger.debug(
    `calling audit.saveDoc on doc ${change.id} seq ${change.seq}`);

  audit.saveDoc(change.doc, err => {
    // todo: how to handle a failed save? for now just
    // waiting until next change and try again.
    if (err) {
      logger.error(`error saving changes on doc ${change.id} seq ${change.seq}: ${JSON.stringify(err)}`);
    } else {
      logger.info(`saved changes on doc ${change.id} seq ${change.seq}`);
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
const applyTransition = (options, callback) => {

  const key = options.key,
        change = options.change,
        transition = options.transition,
        audit = options.audit,
        db = options.db;

  const _setProperty = (property, value) => {
    const doc = change.doc;
    if (!doc.transitions) {
      doc.transitions = {};
    }
    if (!doc.transitions[key]) {
      doc.transitions[key] = {};
    }
    doc.transitions[key][property] = value;
  };

  logger.debug(
    `calling transition.onMatch for doc ${change.id} seq ${change.seq} and transition ${key}`);

  /*
   * Transitions are async and should return true if the document has
   * changed.  If a transition errors then log the error, but don't return it
   * because that will stop the series and the other transitions won't run.
   */
  transition.onMatch(change, db, audit, (err, changed) => {
    logger.debug(
      `finished transition ${key} for seq ${change.seq} doc ${change.id} is ` +
      changed ? 'changed' : 'unchanged'
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
        code: `${key}_error'`,
        message: `Transition error on ${key}: ` +
          err.message ? err.message: JSON.stringify(err)
      });
      logger.error(
        `transition ${key} errored on doc ${change.id} seq ${change.seq}: ${JSON.stringify(err)}`);
    }
    callback(null, changed);
  });
};

const applyTransitions = (options, callback) => {
  const operations = [];
  _.each(transitions, (transition, key) => {
    const opts = {
      key: key,
      change: options.change,
      transition: transition,
      audit: options.audit,
      db: options.db
    };
    if (!canRun(opts)) {
      logger.debug(
        `canRun test failed on transition ${key} for seq ${options.change.seq} doc ${options.change.id}`);
      return;
    }
    operations.push(cb => applyTransition(opts, cb));
  });

  /*
   * Run transitions in series and finalize. We ignore err here
   * because it is never returned, we process it within the operation
   * function.  All we care about are results and whether we need to
   * save or not.
   */
  async.series(operations, (err, results) =>
    finalize({
      change: options.change,
      audit: options.audit,
      results: results
    }, callback));
};

const getMetaData = callback =>
  db.medic.get(METADATA_DOCUMENT, (err, doc) => {
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

const getProcessedSeq = callback =>
  getMetaData((err, doc) => {
    if (err) {
      logger.error('Error getting meta data', err);
      return callback(err);
    }
    callback(null, doc.processed_seq);
  });

const updateMetaData = (seq, callback) =>
  getMetaData((err, metaData) => {
    if (err) {
      logger.error('Error fetching metaData for update', err);
      return callback();
    }
    metaData.processed_seq = seq;
    db.medic.insert(metaData, err => {
      if (err) {
        logger.error('Error updating metaData', err);
      }
      return callback();
    });
  });

/*
 *  Setup changes feed listener.
 */
const attach = () => {
  // tell everyone we're here
  logger.info('transitions: processing enabled');

  getProcessedSeq((err, processedSeq) => {
    if (err) {
      logger.error('transitions: error fetching processed seq', err);
      return;
    }
    logger.info(`transitions: fetching changes feed, starting from ${processedSeq}`);
    const feed = new follow.Feed({
      db: process.env.COUCH_URL,
      since: processedSeq
    });
    feed.on('change', change => {
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
