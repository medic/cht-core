/*
 * Transitions runner.  Set up the changes listener and apply each transition
 * serially to a change.
 */

const _ = require('underscore'),
  async = require('async'),
  utils = require('../lib/utils'),
  feed = require('../lib/feed'),
  dbPouch = require('../db-pouch'),
  lineage = require('lineage')(Promise, dbPouch.medic),
  logger = require('../lib/logger'),
  config = require('../config'),
  db = require('../db-nano'),
  infodoc = require('../lib/infodoc'),
  metadata = require('../lib/metadata'),
  tombstoneUtils = require('@shared-libs/tombstone-utils'),
  PROCESSING_DELAY = 50, // ms
  PROGRESS_REPORT_INTERVAL = 500, // items
  transitions = [];

let changesFeed;

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

let processed = 0;

const changeQueue = async.queue((task, callback) =>
  processChange(task, () => _.delay(callback, PROCESSING_DELAY))
);

const processChange = (change, callback) => {
  if (!change) {
    return callback();
  }
  logger.debug(`change event on doc ${change.id} seq ${change.seq}`);
  if (processed > 0 && processed % PROGRESS_REPORT_INTERVAL === 0) {
    logger.info(
      `transitions: ${processed} items processed (since sentinel started)`
    );
  }
  if (change.deleted) {
    // don't run transitions on deleted docs, but do clean up
    async.parallel(
      [
        callback => {
          infodoc
            .delete(change)
            .then(() => {
              callback();
            })
            .catch(err => {
              callback(err);
            });
        },
        async.apply(deleteReadDocs, change),
      ],
      err => {
        if (err) {
          logger.error('Error cleaning up deleted doc: %o', err);
        }

        tombstoneUtils
          .processChange(Promise, dbPouch.medic, change, logger)
          .then(() => {
            processed++;
            metadata
              .update(change.seq)
              .then(() => {
                callback();
              })
              .catch(err => {
                callback(err);
              });
          })
          .catch(err => {
            callback(err);
          });
      }
    );
    return;
  }

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
        module.exports.applyTransitions(change, () => {
          processed++;
          metadata
            .update(change.seq)
            .then(() => callback())
            .catch(err => {
              callback(err);
            });
        });
      });
    })
    .catch(err => {
      logger.error('transitions: fetch failed for %s : %o', change.id, err);
      return callback();
    });
};

const deleteReadDocs = (change, callback) => {
  // we don't know if the deleted doc was a report or a message so
  // attempt to delete both
  const possibleReadDocIds = ['report', 'message'].map(
    type => `read:${type}:${change.id}`
  );

  db.db.list((err, dbs) => {
    if (err) {
      return callback(err);
    }

    const userDbs = dbs.filter(db => db.indexOf('medic-user-') === 0);

    async.eachSeries(
      userDbs,
      (userDb, callback) => {
        const metaDb = db.use(userDb);
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
          metaDb.insert(row.doc, err => {
            // ignore 404s or 409s - the doc was probably deleted client side already
            if (err && err.statusCode !== 404 && err.statusCode !== 409) {
              return callback(err);
            }
            callback();
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
 */
const loadTransitions = () => {
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
      self._loadTransition(transition);
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
    logger.error(
      'Transitions are disabled until the above configuration errors are fixed.'
    );
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
      `isRevSame tested true on transition ${key} for seq ${change.seq} doc ${
        change.id
      }`
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
    return callback();
  }
  logger.debug(`calling saveDoc on doc ${change.id} seq ${change.seq}`);

  lineage.minify(change.doc);
  dbPouch.medic.put(change.doc, err => {
    // todo: how to handle a failed save? for now just
    // waiting until next change and try again.
    if (err) {
      logger.error(
        `error saving changes on doc ${change.id} seq ${
          change.seq
        }: ${JSON.stringify(err)}`
      );
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
const applyTransition = ({ key, change, transition }, callback) => {
  logger.debug(
    `calling transition.onMatch for doc ${change.id} seq ${
      change.seq
    } and transition ${key}`
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
        `finished transition ${key} for seq ${change.seq} doc ${
          change.id
        } is ` + changed ? 'changed' : 'unchanged'
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
      logger.error(
        `transition ${key} errored on doc ${change.id} seq ${
          change.seq
        }: ${JSON.stringify(err)}`
      );
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
      if (!canRun(opts)) {
        logger.debug(
          `canRun test failed on transition ${transition.key} for seq ${
            change.seq
          } doc ${change.id}`
        );
        return;
      }
      return _.partial(applyTransition, opts, _);
    })
    .filter(transition => !!transition);

  /*
   * Run transitions in series and finalize. We ignore err here
   * because it is never returned, we process it within the operation
   * function.  All we care about are results and whether we need to
   * save or not.
   */
  async.series(operations, (err, results) =>
    finalize(
      {
        change: change,
        results: results,
      },
      callback
    )
  );
};

const detach = () => {
  if (changesFeed) {
    changesFeed.cancel();
    changesFeed = null;
  }
};

/*
 *  Setup changes feed listener.
 */
const attach = () => {
  if (!changesFeed) {
    logger.info('transitions: processing enabled');
    return metadata
      .getProcessedSeq()
      .catch(err => {
        logger.error('transitions: error fetching processed seq: %o', err);
      })
      .then(seq => {
        logger.info(`transitions: fetching changes feed, starting from ${seq}`);
        changesFeed = feed.followFeed(seq, changeQueue);
      });
  }
};

const availableTransitions = () => {
  return AVAILABLE_TRANSITIONS;
};

module.exports = {
  _loadTransition: loadTransition,
  _changeQueue: changeQueue,
  _attach: attach,
  _detach: detach,
  _deleteReadDocs: deleteReadDocs,
  _lineage: lineage,
  availableTransitions: availableTransitions,
  loadTransitions: loadTransitions,
  canRun: canRun,
  finalize: finalize,
  applyTransition: applyTransition,
  applyTransitions: applyTransitions,
};
