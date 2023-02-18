const _ = require('lodash');
const async = require('async');
const db = require('../db');
const lineage = require('@medic/lineage')(Promise, db.medic);
const utils = require('../lib/utils');
const logger = require('../lib/logger');
const config = require('../config');
const infodoc = require('@medic/infodoc');
const uuid = require('uuid').v4;

infodoc.initLib(db.medic, db.sentinel);
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
  'self_report',
  'registration',
  'accept_patient_reports',
  'accept_case_reports',
  'generate_shortcode_on_contacts',
  'generate_patient_id_on_people',
  'default_responses',
  'update_sent_by',
  'death_reporting',
  'conditional_alerts',
  'multi_report_alerts',
  'update_notifications',
  'update_scheduled_reports',
  'resolve_pending',
  'muting',
  'mark_for_outbound',
  'create_user_for_contacts'
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
        change.initialProcessing = !infoDoc.transitions;
        // Remove transitions from doc since those
        // will be handled by the info doc(sentinel db) after this
        if (change.doc.transitions) {
          delete change.doc.transitions;
        }
        module.exports.applyTransitions(change, callback);
      });
    })
    .catch(err => {
      logger.error('transitions: processChange failed for %s : %o', change.id, err);
      return callback(err);
    });
};

// given a collection of docs this function will:
// - add _id properties to the docs that are missing them
// - deep clone the docs, to keep the original version of them safe
// - hydrate the docs and generate info docs
// - run loaded transitions over all docs
// - save docs, either updated or their original version
// - returns db.save result like a bulkDocs call.
const processDocs = docs => {
  if (!transitions.length) {
    return db.medic.bulkDocs(docs);
  }

  let changes;
  docs.forEach(doc => doc._id = doc._id || uuid());
  const clonedDocs = JSON.parse(JSON.stringify(docs));

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
          applyTransitions(change, (err, result) => {
            if (err || result) {
              return callback(null, err || result);
            }

            // doc was not changed by any transition, so we save the original doc
            change.doc = docs.find(doc => doc._id === change.id);
            saveDoc(change, (err, result) => {
              callback(null, err || result);
            });
          });
        });
        async.series(operations, (err, results) => {
          return err ? reject(err) : resolve(results);
        });
      });
    })
    .catch(err => {
      logger.error('Error when running transitions over docs: %o', err);
      return db.medic.bulkDocs(docs);
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
    const transition = (info.transitions && info.transitions[key]) ||
                       (doc.transitions && doc.transitions[key]) ||
                       false;

    const revSame = transition && parseInt(doc._rev) === parseInt(transition.last_rev);

    logger.debug(
      `isRevSame tested ${revSame} on transition ${key} for doc ${change.id} seq ${change.seq}`
    );
    return revSame;
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
    transition.filter(change)
  );
};

/*
 * Save the doc if we have changes from transitions, otherwise transitions
 * did nothing and saving is unnecessary.  If results has a true value in
 * it then a change was made.
 */
const finalize = ({ change, results }, callback) => {
  logger.debug(`transition results: ${JSON.stringify(results)}`);

  const changed = _.some(results, i => Boolean(i));
  if (!changed) {
    logger.debug(
      `nothing changed skipping saveDoc for doc ${change.id} seq ${change.seq}`
    );
    // info.transitions is how we know if a doc has been processed by Sentinel before. Even if no transitions ran,
    // we still want to save transitions, so we know it's been processed.
    return Promise
      .resolve()
      .then(() => {
        if (change.initialProcessing) {
          return infodoc.saveTransitions(change);
        }
      })
      .then(() => callback())
      .catch(err => callback(err));
  }
  logger.debug(`calling saveDoc on doc ${change.id} seq ${change.seq}`);

  saveDoc(change, (err, result) => {
    // todo: how to handle a failed save? for now just
    // waiting until next change and try again.
    if (err) {
      logger.error(`error saving changes on doc ${change.id} seq ${change.seq}: %o`, err);
      return callback(err);
    }

    logger.info(`saved changes on doc ${change.id} seq ${change.seq}`);
    infodoc.saveTransitions(change)
      .then(() => callback(null, result))
      .catch(err => callback(err));
  });
};

const saveDoc = (change, callback) => {
  lineage.minify(change.doc);
  db.medic.put(change.doc, callback);
};

/*
 * All transitions reference the same change.doc and work in series to
 * apply changes to it.  A transition is free to make async calls but the next
 * transition will only run after the previous transitions' callback is
 * called.  This is a performance optimization that allows us to apply N
 * transitions (updates) to a document with the cost of a single database
 * change/write.
 */
const applyTransition = ({ key, change, transition, force }, callback) => {
  try {
    if (!force && !canRun({ key, change, transition })) {
      logger.debug(`canRun test failed on transition ${key} for doc ${change.id} seq ${change.seq}`);
      return callback();
    }
  } catch (err) {
    logger.error(`canRun test errored on transition ${key} for doc ${change.id}: %o`, err);
    return callback(null, false);
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
      infodoc.updateTransition(change, key, true);
      return changed;
    })
    .catch(err => {
      // adds an error to the doc but it will only get saved if there are
      // other changes too.
      const message = err.message || JSON.stringify(err);
      utils.addError(change.doc, {
        code: `${key}_error'`,
        message: `Transition error on ${key}: ${message}`,
      });
      logger.error(`transition ${key} errored on doc ${change.id} seq ${change.seq}: %o`, err);
      if (!err.changed) {
        return false;
      }
      infodoc.updateTransition(change, key, false);
      return true;
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
      return _.partial(module.exports.applyTransition, opts, _);
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

const getDeprecatedTransitions = () => {
  const deprecatedList = [];

  AVAILABLE_TRANSITIONS.forEach(transitionName => {
    try {
      const transition = require('./' + transitionName);

      if (transition.deprecated) {
        deprecatedList.push(transition);
      }
    } catch (e) {
      logger.error(`Failed read transition "${transitionName}"`);
      logger.error('%o', e);
    }
  });

  return deprecatedList;
};

module.exports = {
  _loadTransition: loadTransition,
  _lineage: lineage,
  availableTransitions: availableTransitions,
  loadTransitions: loadTransitions,
  canRun: canRun,
  finalize: finalize,
  applyTransition: applyTransition,
  applyTransitions: applyTransitions,
  processChange: processChange,
  processDocs: processDocs,
  _transitions: () => transitions,
  getDeprecatedTransitions: getDeprecatedTransitions
};
