const _ = require('lodash');
const config = require('../config');
const transitionUtils = require('./utils');
const utils = require('../lib/utils');
const messages = require('../lib/messages');
const mutingUtils = require('../lib/muting_utils');
const contactTypesUtils = require('@medic/contact-types-utils');
const transitions = require('./index');

const TRANSITION_NAME = 'muting';
const CONFIG_NAME = 'muting';
const MUTE_PROPERTY = 'mute_forms';
const UNMUTE_PROPERTY = 'unmute_forms';

const getConfig = () => {
  return config.get(CONFIG_NAME) || {};
};

const isMuteForm = form => {
  return Boolean(getConfig()[MUTE_PROPERTY].find(muteFormId => utils.isFormCodeSame(form, muteFormId)));
};

const isUnmuteForm = form => {
  const unmuteForms = getConfig()[UNMUTE_PROPERTY];
  return Boolean(unmuteForms && unmuteForms.find(unmuteFormId => utils.isFormCodeSame(form, unmuteFormId)));
};

const getEventType = muted => muted ? 'mute' : 'unmute';

const isContact = doc => !!contactTypesUtils.getContactType(config.getAll(), doc);

const isRelevantReport = (doc, info = {}) =>
  Boolean(doc &&
          doc.form &&
          doc.type === 'data_record' &&
          ( isMuteForm(doc.form) || isUnmuteForm(doc.form) ) &&
          !transitionUtils.hasRun(info, TRANSITION_NAME) &&
          utils.isValidSubmission(doc));

const isNewContactWithMutedParent = (doc, infoDoc = {}) => {
  return Boolean(
    !doc.muted &&
    // If initial_replication_date is 'unknown' .getTime() will return NaN, which is an
    // acceptable value to pass to isMutedInLineage (it will mean that it won't match because
    // there is no possible mute date that is "after" NaN)
    mutingUtils.isMutedInLineage(doc, new Date(infoDoc.initial_replication_date).getTime()) &&
    !infoDoc.muting_history &&
    !mutingUtils.isLastUpdatedOffline(doc) // contacts that are updated offline are treated separately
  );
};

//
// When *new* contacts are added that have muted parents, they and their schedules should be muted.
//
// We are deciding a contact is new if:
//  - They were initially replicated *after* a mute that has happened in their parent lineage
//  - And we haven't performed any kind of mute on them before
//
const isRelevantContact = (doc, infoDoc = {}) => {
  return Boolean(
    doc &&
    isContact(doc) &&
    (isNewContactWithMutedParent(doc, infoDoc) || mutingUtils.isLastUpdatedOffline(doc))
  );
};

const processContact = (change) => {
  let muted;
  if (isNewContactWithMutedParent(change.doc, change.info)) {
    muted = new Date();
  } else {
    muted = change.doc.muted ? new Date() : false;
  }

  return mutingUtils
    .updateRegistrations(utils.getSubjectIds(change.doc), muted)
    .then(() => mutingUtils.updateMutingHistory(
      change.doc,
      new Date(change.info.initial_replication_date).getTime(),
      muted
    ))
    .then(() => {
      mutingUtils.updateContact(change.doc, muted);
      return true;
    });
};

/**
 * Given a list of report ids to process
 * - hydrates the docs
 * - excludes irrelevant reports
 * - reads infodocs
 * - (re)runs muting transition over every report, in sequence, even if it had already ran
 * - reports should be processed in the same order we have received them
 * The purpose of this action is to reconcile offline muting events that have already been processed offline, but due
 * to characteristics of CouchDB + PouchDB sync + changes watching, there is no guarantee that we process these
 * changes in their chronological order naturally.
 * The reportIds parameter is a list of reports that have been created offline _after_ the currently processed report,
 * have have affected one contact that this report has updated.
 * This resolves most "conflicts" but does not guarantee a consistent muting state for every case.
 *
 * @param {Array<string>} reportIds - an ordered list of report uuids to be processed
 * @return {Promise}
 */
const replayOfflineMutingEvents = (reportIds = []) => {
  if (!reportIds.length) {
    return Promise.resolve();
  }

  return mutingUtils.lineage
    .fetchHydratedDocs(reportIds)
    .then(hydratedReports => {
      hydratedReports = hydratedReports.filter(doc => isRelevantReport(doc, {}));

      const changes = hydratedReports.map(report => ({ id: report._id }));
      return mutingUtils.infodoc.bulkGet(changes).then(infoDocs => {
        let promiseChain = Promise.resolve();
        reportIds.forEach(reportId => {
          const hydratedReport = hydratedReports.find(report => report._id === reportId);
          if (!hydratedReport) {
            return;
          }
          promiseChain = promiseChain.then(() => runTransition(hydratedReport, infoDocs));
        });
        return promiseChain;
      });
    });
};

/**
 * Runs muting transition over provided report
 * @param {Object} hydratedReport
 * @param {Array<Object>} infoDocs
 * @return {Promise}
 */
const runTransition = (hydratedReport, infoDocs = []) => {
  const change = {
    id: hydratedReport._id,
    doc: hydratedReport,
    info: infoDocs.find(infoDoc => infoDoc.doc_id === hydratedReport._id),
  };

  const transitionContext = {
    change,
    transition: module.exports,
    key: TRANSITION_NAME,
    force: true,
  };
  return new Promise((resolve, reject) => {
    transitions.applyTransition(transitionContext, (err, result) => {
      const transitionContext = { change, results: [result] };
      transitions.finalize(transitionContext, (err) => err ? reject(err) : resolve());
    });
  });
};

const wasProcessedOffline = (change) => {
  return change.doc &&
         change.doc.offline_transitions &&
         change.doc.offline_transitions[TRANSITION_NAME];
};

const processMutingEvent = (contact, change, muteState) => {
  const processedOffline = wasProcessedOffline(change);
  return mutingUtils
    .updateMuteState(contact, muteState, change.id, processedOffline)
    .then(reportIds => {
      module.exports._addMsg(getEventType(muteState), change.doc, contact);

      if (processedOffline) {
        return replayOfflineMutingEvents(reportIds);
      }
    });
};

module.exports = {
  name: TRANSITION_NAME,
  asynchronousOnly: true,

  init: () => {
    const forms = getConfig()[MUTE_PROPERTY];
    if (!forms || !_.isArray(forms) || !forms.length) {
      throw new Error(
        `Configuration error. Config must define have a '${CONFIG_NAME}.${MUTE_PROPERTY}' array defined.`
      );
    }
  },

  filter: (doc, info = {}) => isRelevantReport(doc, info) || isRelevantContact(doc, info),

  validate: (doc) => {
    const config = getConfig();
    return transitionUtils.validate(config, doc).then(errors => {
      if (errors && errors.length) {
        messages.addErrors(config, doc, errors, { patient: doc.patient, place: doc.place });
        return false;
      }
      return true;
    });
  },

  onMatch: change => {
    if (change.doc.type !== 'data_record') {
      return processContact(change);
    }

    const muteState = isMuteForm(change.doc.form);
    const contact = change.doc.patient || change.doc.place;

    if (!contact) {
      module.exports._addErr('contact_not_found', change.doc);
      module.exports._addMsg('contact_not_found', change.doc);
      return Promise.resolve(true);
    }

    return module.exports
      .validate(change.doc)
      .then(valid => {
        if (!valid) {
          return;
        }

        if (Boolean(contact.muted) === muteState && !wasProcessedOffline(change)) {
          // don't update registrations if contact already has desired state
          // but do process muting events that have been handled offline
          module.exports._addMsg(contact.muted ? 'already_muted' : 'already_unmuted', change.doc);
          return;
        }

        return processMutingEvent(contact, change, muteState);
      })
      .then(() => true);
  },
  _addMsg: function(eventType, doc, contact) {
    const msgConfig = _.find(getConfig().messages, { event_type: eventType });
    if (msgConfig) {
      messages.addMessage(doc, msgConfig, msgConfig.recipient, { patient: contact });
    }
  },
  _addErr: function(eventType, doc) {
    const locale = utils.getLocale(doc);
    const evConf = _.find(getConfig().messages, { event_type: eventType });

    const msg = messages.getMessage(evConf, locale);
    if (msg) {
      messages.addError(doc, msg);
    } else {
      messages.addError(doc, `Failed to complete muting request, event type "${eventType}" misconfigured.`);
    }
  }
};
