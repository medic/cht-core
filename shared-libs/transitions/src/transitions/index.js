const _ = require('underscore'),
      async = require('async'),
      db = require('../db'),
      lineage = require('@medic/lineage')(Promise, db.medic),
      utils = require('../lib/utils'),
      logger = require('../lib/logger'),
      config = require('../config'),
      infodoc = require('../lib/infodoc'),
      uuid = require('uuid');

/*
 * Add new transitions here to make them available for configuration and execution.
 * Transitions are executed in the order they appear in this array.
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
  'resolve_pending',
  'muting'
];

const transitions = [];

// applies all loaded transitions over a change
const processChange = (change, callback) => {
  lineage
    .fetchHydratedDoc(change.id)
    .then(doc => {
      change.doc = doc;
      return infodoc.get(change).then(infoDoc => {
        change.info = infoDoc;
        // Remove transitions from doc since those
        // will be handled by the info doc(sentinel db) after this
        if (change.doc.transitions) {
          delete change.doc.transitions;
        }
        applyTransitions(change, callback);
      });
    })
    .catch(err => {
      logger.error('transitions: fetch failed for %s : %o', change.id, err);
      return callback(err);
    });
};

// given a collection of docs this function will:
// - deep clone the docs, to keep the original version of them safe
// - add _id properties to the docs that are missing them
// - hydrate the docs and generate info docs
// - run loaded transitions over all docs
// - returns docs, either updated or their original version
const processDocs = docs => {
  if (!transitions.length) {
    return Promise.resolve(docs);
  }

  let changes;
  const clonedDocs = JSON.parse(JSON.stringify(docs)),
        idsByIdx = new Array(clonedDocs.length);
  // keep a way to link the changed doc to the original doc
  // there may be no reliable way to uniquely identify any of these docs
  clonedDocs.forEach((doc, idx) => {
    doc._id = doc._id || uuid();
    idsByIdx[idx] = doc._id;
  });

  return lineage
    .hydrateDocs(clonedDocs)
    .then(hydratedDocs => {
      changes = hydratedDocs.map(doc => ({ id: doc._id, doc: doc, seq: null }));
      return infodoc.bulkGet(changes);
    })
    .then(infoDocs => {
      changes.forEach(change => {
        change.info = infoDocs.find(infoDoc => infoDoc.doc_id === change.id);
      });
      return infodoc.bulkUpdate(infoDocs);
    })
    .then(() => {
      return new Promise((resolve, reject) => {
        const operations = changes.map(change => callback => {
          module.exports.applyTransitions(change, (err, changed) => {
            if (!err && changed) {
              return callback(null, change.doc);
            }

            // doc was not changed by any transition, so we return the original doc
            const idx = idsByIdx.findIndex(id => id === change.id);
            return err ? callback(err) : callback(null, docs[idx]);
          });
        });
        async.series(operations, (err, results) => {
          return err ? reject(err) : resolve(results);
        });
      });
    })
    .catch(err => {
      logger.error('Error when running transitions over docs', err);
      return docs;
    });
};

/*
 * Load transitions using `require` based on what is in AVAILABLE_TRANSITIONS
 * constant and what is enabled in the `transitions` property in the settings
 * data.  Log warnings on failure.
 * Using synchronous param, only loads transitions that are NOT marked to only be executed asynchronously.
 */
const loadTransitions = (synchronous = false) => {
  const self = module.exports;
  const transitionsConfig = config.get('transitions') || [];
  let loadError = false;

  transitions.splice(0, transitions.length);

  // Load all configured transitions
  AVAILABLE_TRANSITIONS.forEach(transition => {
    const conf = transitionsConfig[transition];

    const disabled = conf && conf.disable;

    if (!conf || disabled) {
      return logger.warn(`Disabled transition "${transition}"`);
    }

    try {
      self._loadTransition(transition, synchronous);
    } catch (e) {
      loadError = true;
      logger.error(`Failed loading transition "${transition}"`);
      logger.error('%o', e);
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
    // empty transitions list
    // Sentinel detaches from the changes feed when transitions are misconfigured,
    // but API continues and should not run partial transitions
    transitions.splice(0, transitions.length);
    throw new Error('Transitions are disabled until the above configuration errors are fixed.');
  }
};

const loadTransition = (key, synchronous) => {
  logger.info(`Loading transition "${key}"`);
  const transition = require('./' + key);

  if (synchronous && transition.asynchronousOnly) {
    logger.info(`Skipping asynchronous transition "${key}"`);
    return;
  }

  if (transition.init) {
    transition.init();
  }

  transitions.push({ key: key, module: transition });
};

/*
 * Determines whether a transition is okay to run on a document.  Removed
 * repeatable logic, assuming all transitions are repeatable without adverse
 * effects.
 */
const canRun = ({ key, change, transition }) => {
  const doc = change.doc;
  const info = change.info;

  const isRevSame = (doc, info) => {
    if (info.transitions && info.transitions[key]) {
      return parseInt(doc._rev) === parseInt(info.transitions[key].last_rev);
    }
    if (doc.transitions && doc.transitions[key]) {
      return parseInt(doc._rev) === parseInt(doc.transitions[key].last_rev);
    }
    logger.debug(
      `isRevSame tested true on transition ${key} for doc ${change.id} seq ${change.seq}`
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
    change &&
    !change.deleted &&
    doc &&
    !isRevSame(doc, info) &&
    transition.filter(doc, info)
  );
};

/*
 * Returns true if we have changes from transitions, otherwise transitions
 * did nothing and saving is unnecessary.  If results has a true value in
 * it then a change was made.
 * Minifies lineage before calling back.
 */
const finalize = ({ change, results }, callback) => {
  logger.debug(`transition results: ${JSON.stringify(results)}`);

  const changed = _.some(results, i => Boolean(i));
  if (!changed) {
    logger.debug(
      `nothing changed skipping saveDoc for doc ${change.id} seq ${change.seq}`
    );
    return callback();
  }

  lineage.minify(change.doc);
  callback(null, true);
};

/*
 * All transitions reference the same change.doc and work in series to
 * apply changes to it.  A transition is free to make async calls but the next
 * transition will only run after the previous transitions's callback is
 * called.  This is a performance optimization that allows us to apply N
 * transitions (updates) to a document with the cost of a single database
 * change/write.
 */
const applyTransition = ({ key, change, transition }, callback) => {
  if (!canRun({ key, change, transition })) {
    logger.debug(
      `canRun test failed on transition ${transition.key} for doc ${change.id} seq ${change.seq}`
    );
    return callback();
  }

  logger.debug(
    `calling transition.onMatch for doc ${change.id} and transition ${key} seq ${change.seq}`
  );

  /*
   * Transitions are async and should return true if the document has
   * changed.  If a transition errors then log the error, but don't return it
   * because that will stop the series and the other transitions won't run.
   */
  transition
    .onMatch(change)
    .then(changed => {
      logger.debug(
        `finished transition ${key} doc ${change.id} is ${changed ? 'changed' : 'unchanged'} seq ${change.seq}`
      );
      if (!changed) {
        return changed;
      }
      return infodoc.updateTransition(change, key, true).then(() => {
        return changed;
      });
    })
    .catch(err => {
      // adds an error to the doc but it will only get saved if there are
      // other changes too.
      const message = err.message || JSON.stringify(err);
      utils.addError(change.doc, {
        code: `${key}_error'`,
        message: `Transition error on ${key}: ${message}`,
      });
      logger.error(`transition ${key} errored on doc ${change.id} seq ${change.seq}: ${JSON.stringify(err)}`);
      if (!err.changed) {
        return false;
      }
      return infodoc.updateTransition(change, key, false).then(() => {
        return true;
      });
    })
    .then(changed => callback(null, changed)); // return the promise instead
};

const applyTransitions = (change, callback) => {
  const operations = transitions
    .map(transition => {
      const opts = {
        key: transition.key,
        change: change,
        transition: transition.module,
      };
      return _.partial(applyTransition, opts, _);
    })
    .filter(transition => !!transition);

  /*
   * Run transitions in series and finalize. We ignore err here
   * because it is never returned, we process it within the operation
   * function.  All we care about are results and whether we need to
   * save or not.
   */
  async.series(operations, (err, results) => finalize({ change, results }, callback));
};

const availableTransitions = () => {
  return AVAILABLE_TRANSITIONS;
};

module.exports = {
  _loadTransition: loadTransition,
  availableTransitions: availableTransitions,
  loadTransitions: loadTransitions,
  canRun: canRun,
  applyTransition: applyTransition,
  applyTransitions: applyTransitions,
  finalize: finalize,
  processChange: processChange,
  processDocs: processDocs,
  _lineage: lineage,
  _transitions: () => transitions
};
