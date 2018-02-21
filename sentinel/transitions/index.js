/*
 * Transitions runner.  Set up the changes listener and apply each transition
 * serially to a change.
 */

const _ = require('underscore'),
      follow = require('follow'),
      async = require('async'),
      utils = require('../lib/utils'),
      lineage = require('../lib/lineage'),
      logger = require('../lib/logger'),
      config = require('../config'),
      db = require('../db'),
      PROCESSING_DELAY = 50, // ms
      PROGRESS_REPORT_INTERVAL = 500, // items
      transitions = {};

let changesFeed;

// We log the first time we catch up to the changes feed
let caughtUpOnce;

/*
 * Add new transitions here to make them available for configuration and execution.
 *
 * (For security reasons, we want to avoid doing a `require` based on random input,
 *  hence we maintain this index of transitions.)
 *
 * Transition on this list:
 *  - Are disabled by default, and can be enabled in configuration
 *  - should be documented as to what they do and how they are configured in
 *    medic-docs
 */
const AVAILABLE_TRANSITIONS = [
  'maintain_info_document',
  'update_clinics',
  'registration',
  'accept_patient_reports',
  'generate_patient_id_on_people',
  'default_responses',
  'update_sent_by',
  'update_sent_forms',
  'death_reporting',
  'conditional_alerts',
  'multi_report_alerts',
  'update_notifications',
  'update_scheduled_reports',
  'resolve_pending'
];

/*
 * Add transitions here to have them execute by default.
 *
 * Transitions on this list:
 *  - must still be in the above master list
 *  - can still be configured to be explicitly disabled if needed
 *  - should not expect any particular configuration (as they run by default)
 *  - do not necessarily need to be documented externally
 *
 * Only add transitions here whose lack of running would break data / system
 * expectations, not just because you think most will want them to run.
 */
const SYSTEM_TRANSITIONS = [
  'maintain_info_document'
];

// Init assertion that all SYSTEM_TRANSITIONS are also in AVAILABLE_TRANSITIONS
(() => {
  if (SYSTEM_TRANSITIONS.filter(transition => !AVAILABLE_TRANSITIONS.includes(transition)).length) {
    logger.error('FATAL: All SYSTEM_TRANSITIONS must also be in AVAILABLE_TRANSITIONS');
    process.exit(1);
  }
})();

const METADATA_DOCUMENT = '_local/sentinel-meta-data';

let processed = 0;

const changeQueue = async.queue((task, callback) =>
  processChange(task, () => _.delay(callback, PROCESSING_DELAY)));

const processChange = (change, callback) => {
  if (!change) {
    return callback();
  }
  logger.debug(`change event on doc ${change.id} seq ${change.seq}`);
  if (processed > 0 && (processed % PROGRESS_REPORT_INTERVAL) === 0) {
    logger.info(`transitions: ${processed} items processed (since sentinel started)`);
  }
  if (change.deleted) {
    // don't run transitions on deleted docs, but do clean up
    async.parallel([
      async.apply(deleteInfoDoc, change),
      async.apply(deleteReadDocs, change)
    ], err => {
      if (err) {
        logger.error('Error cleaning up deleted doc', err);
      }
      processed++;
      updateMetaData(change.seq, callback);
    });
    return;
  }
  lineage.fetchHydratedDoc(change.id)
    .then(doc => {
      change.doc = doc;
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
    })
    .catch(err => {
      logger.error(`transitions: fetch failed for ${change.id} (${err})`);
      return callback();
    });
};

const deleteInfoDoc = (change, callback) => {
  db.medic.get(`${change.id}-info`, (err, doc) => {
    if (err) {
      if (err.statusCode === 404) {
        // don't worry about deleting a non-existant doc
        return callback();
      }
      return callback(err);
    }
    doc._deleted = true;
    db.medic.insert(doc, callback);
  });
};

const getAdminNames = callback => {
  db.medic.view('medic', 'online_user_settings_by_id', {}, (err, results) => {
    if (err) {
      return callback(err);
    }
    const admins = results.rows
      .map(row => {
        const parts = row.id.split(':');
        return parts.length > 1 && parts[1];
      })
      .filter(name => !!name);
    callback(null, admins);
  });
};

const deleteReadDocs = (change, callback) => {

  // we don't know if the deleted doc was a report or a message so
  // attempt to delete both
  const possibleReadDocIds = [ 'report', 'message' ]
    .map(type => `read:${type}:${change.id}`);

  getAdminNames((err, admins) => {
    if (err) {
      return callback(err);
    }

    async.each(
      admins,
      (admin, callback) => {
        const metaDb = db.use(`medic-user-${admin}-meta`);
        metaDb.info(err => {
          if (err) {
            if (err.statusCode === 404) {
              // no meta data db exists for this user - ignore
              return callback();
            }
            return callback(err);
          }
          metaDb.fetch({ keys: possibleReadDocIds }, (err, results) => {
            if (err) {
              return callback(err);
            }
            // find which of the possible ids was the right one
            const row = results.rows.find(row => !!row.doc);
            if (!row) {
              return callback();
            }
            row.doc._deleted = true;
            metaDb.insert(row.doc, callback);
          });
        });
      },
      callback
    );
  });
};

/*
 * Load transitions using `require` based on what is in AVAILABLE_TRANSITIONS
 * constant and what is enabled in the `transitions` property in the settings
 * data.  Log warnings on failure.
 *
 * Tests can diabled autoEnableSystemTransitions for more control.
 */
const loadTransitions = (autoEnableSystemTransitions = true) => {

  const self = module.exports;
  const transitionsConfig = config.get('transitions') || [];
  let loadError = false;

  // Load all system or configured transitions
  AVAILABLE_TRANSITIONS.forEach(transition => {
    const conf = transitionsConfig[transition];

    const system =
      autoEnableSystemTransitions && SYSTEM_TRANSITIONS.includes(transition);

    const disabled = conf && conf.disable;

    if ((system && disabled) || (!system && !conf || disabled)) {
      return logger.warn(`Disabled transition "${transition}"`);
    }

    try {
      self._loadTransition(transition);
    } catch(e) {
      loadError = true;
      logger.error(`Failed loading transition "${transition}"`);
      logger.error(e);
    }
  });

  // Warn if there are configured transitions that are not available
  Object.keys(transitionsConfig).forEach(key => {
    if (!AVAILABLE_TRANSITIONS.includes(key)) {
      loadError = true;
      logger.error(`Unknown transition "${key}"`);
    }
  });

  if (loadError) {
    logger.error('Transitions are disabled until the above configuration errors are fixed.');
    module.exports._detach();
  } else {
    module.exports._attach();
  }
};

const loadTransition = key => {
  logger.info(`Loading transition "${key}"`);
  const transition = require('./' + key);
  if (transition.init) {
    transition.init();
  }
  transitions[key] = transition;
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

  lineage.minify(change.doc);
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

const migrateOldMetaDoc = (doc, callback) => {
  const stub = {
    _id: doc._id,
    _rev: doc._rev,
    _deleted: true
  };
  logger.info('Deleting old metadata document', doc);
  return db.medic.insert(stub, err => {
    if (err) {
      callback(err);
    } else {
      doc._id = METADATA_DOCUMENT;
      delete doc._rev;
      callback(null, doc);
    }
  });
};

const getMetaData = callback =>
  db.medic.get(METADATA_DOCUMENT, (err, doc) => {
    if (!err) {
      // Doc exists in correct location
      return callback(null, doc);
    } else if (err.statusCode !== 404) {
      return callback(err);
    }

    // Doc doesn't exist.
    // Maybe we have the doc in the old location?
    db.medic.get('sentinel-meta-data', (err, doc) => {
      if (!err) {
        // Old doc exists, delete it and return the base doc to be saved later
        return migrateOldMetaDoc(doc, callback);
      } else if (err.statusCode !== 404) {
        return callback(err);
      }

      // No doc at all, create and return default
      doc = {
        _id: METADATA_DOCUMENT,
        processed_seq: 0
      };

      callback(null, doc);
    });
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

const detach = () => {
  if (changesFeed) {
    changesFeed.stop();
    changesFeed = null;
  }
};

/*
 *  Setup changes feed listener.
 */
const attach = () => {
  if (changesFeed) {
    return;
  }
  logger.info('transitions: processing enabled');
  getProcessedSeq((err, processedSeq) => {
    if (err) {
      logger.error('transitions: error fetching processed seq', err);
      return;
    }
    logger.info(`transitions: fetching changes feed, starting from ${processedSeq}`);
    changesFeed = new follow.Feed({
      db: process.env.COUCH_URL,
      since: processedSeq
    });
    changesFeed.on('change', change => {
      // skip uninteresting documents
      if (change.id.match(/^_design\//) || change.id === METADATA_DOCUMENT) {
        return;
      }
      changeQueue.push(change);
    });
    changesFeed.on('error', err => {
      logger.error('transitions: error from changes feed', err);
    });
    changesFeed.on('catchup', seq => {
      if (!caughtUpOnce) {
        caughtUpOnce = true;
        logger.info(`Sentinel caught up to ${seq}`);
      }
    });
    changesFeed.follow();
  });
};

const availableTransitions = () => {
  return AVAILABLE_TRANSITIONS;
};

module.exports = {
  _loadTransition: loadTransition,
  _changeQueue: changeQueue,
  _attach: attach,
  _detach: detach,
  _deleteInfoDoc: deleteInfoDoc,
  _deleteReadDocs: deleteReadDocs,
  availableTransitions: availableTransitions,
  loadTransitions: loadTransitions,
  canRun: canRun,
  finalize: finalize,
  applyTransition: applyTransition,
  applyTransitions: applyTransitions,
};
