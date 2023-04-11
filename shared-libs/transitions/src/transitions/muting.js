const _ = require('lodash');
const moment = require('moment');

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
const CLIENT_SIDE_TRANSITIONS = 'client_side_transitions';

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
    !mutingUtils.isLastUpdatedByClient(doc) // contacts that are updated client-side are treated separately
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
    (isNewContactWithMutedParent(doc, infoDoc) || mutingUtils.isLastUpdatedByClient(doc))
  );
};

const getMutedDate = (change) => {
  if (isNewContactWithMutedParent(change.doc, change.info) || change.doc.muted) {
    return moment().toISOString();
  }
  return false;
};

const processContact = (change) => {
  const muted = getMutedDate(change);

  const initialReplicationTs = new Date(change.info && change.info.initial_replication_date).getTime();
  return mutingUtils
    .updateRegistrations(utils.getSubjectIds(change.doc), muted)
    .then(() => mutingUtils.updateMutingHistory(change.doc, initialReplicationTs, muted))
    .then(() => mutingUtils.updateContact(change.doc, muted));
};

/**
 * Given a list of report ids to process
 * - hydrates the docs
 * - excludes irrelevant reports
 * - reads infodocs
 * - (re)runs muting transition over every report, in sequence, even if it had already ran
 * - reports should be processed in the same order we have received them
 * The purpose of this action is to reconcile client-side muting events that have already been processed, but due
 * to characteristics of CouchDB + PouchDB sync + changes watching, there is no guarantee that we process these
 * changes in their chronological order naturally.
 * The reportIds parameter is a list of reports that have been created client-side after the currently processed report,
 * and have changed at least one contact that the currently processed report has changed.
 * This resolves most "conflicts" but does not guarantee a consistent muting state for every case.
 *
 * @param {Array<string>} reportIds - an ordered list of report uuids to be processed
 * @return {Promise}
 */
const replayClientMutingEvents = (reportIds = []) => {
  if (!reportIds.length) {
    return Promise.resolve();
  }

  let promiseChain = Promise.resolve();
  reportIds.forEach(reportId => {
    promiseChain = promiseChain
      .then(() => mutingUtils.lineage.fetchHydratedDocs([reportId]))
      .then(([hydratedDoc]) => {
        if (!isRelevantReport(hydratedDoc, {})) {
          return;
        }

        return mutingUtils.infodoc
          .get({ id: hydratedDoc._id, doc: hydratedDoc })
          .then(infoDoc => runTransition(hydratedDoc, infoDoc));
      });
  });

  return promiseChain;
};

/**
 * Runs muting transition over provided report
 * @param {Object} hydratedReport
 * @param {Object} infoDoc
 * @return {Promise}
 */
const runTransition = (hydratedReport, infoDoc) => {
  const change = {
    id: hydratedReport._id,
    doc: hydratedReport,
    info: infoDoc,
    skipReplay: true,
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

const wasProcessedClientSide = (change) => {
  return change.doc &&
         change.doc[CLIENT_SIDE_TRANSITIONS] &&
         change.doc[CLIENT_SIDE_TRANSITIONS][TRANSITION_NAME];
};

const processMutingEvent = (contact, change, muteState, hasRun) => {
  const replayClientSideMuting = wasProcessedClientSide(change) && !change.skipReplay;
  return mutingUtils
    .updateMuteState(contact, muteState, change.id, replayClientSideMuting)
    .then(reportIds => {
      module.exports._addMsg(getEventType(muteState), change.doc, hasRun);

      if (replayClientSideMuting) {
        return replayClientMutingEvents(reportIds);
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

  filter: ({ doc, info }) => isRelevantReport(doc, info) || isRelevantContact(doc, info),

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
    const hasRun = transitionUtils.hasRun(change.info, TRANSITION_NAME);

    if (!contact) {
      module.exports._addErr('contact_not_found', change.doc);
      module.exports._addMsg('contact_not_found', change.doc, hasRun);
      return Promise.resolve(true);
    }

    return module.exports
      .validate(change.doc)
      .then(valid => {
        if (!valid) {
          return;
        }

        if (Boolean(contact.muted) === muteState && !wasProcessedClientSide(change)) {
          // don't update registrations if contact already has desired state
          // but do process muting events that have been handled on the client
          module.exports._addMsg(contact.muted ? 'already_muted' : 'already_unmuted', change.doc, hasRun);
          return;
        }

        return processMutingEvent(contact, change, muteState, hasRun);
      })
      .then(() => true);
  },
  _addMsg: (eventType, doc, forceUniqueMessages) => {
    const msgConfig = _.find(getConfig().messages, { event_type: eventType });
    if (msgConfig) {
      const context = { patient: doc.patient, place: doc.place };
      messages.addMessage(doc, msgConfig, msgConfig.recipient, context, forceUniqueMessages);
    }
  },
  _addErr: (eventType, doc) => {
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
