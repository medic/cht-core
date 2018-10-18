const _ = require('underscore'),
      config = require('../config'),
      transitionUtils = require('./utils'),
      utils = require('../lib/utils'),
      messages = require('../lib/messages'),
      mutingUtils = require('../lib/muting_utils');

const TRANSITION_NAME = 'muting',
      CONFIG_NAME = 'muting',
      MUTE_PROPERTY = 'mute_forms',
      UNMUTE_PROPERTY = 'unmute_forms';

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

const isRelevantReport = (doc, info = {}) =>
  Boolean(doc &&
          doc.form &&
          doc.type === 'data_record' &&
          ( isMuteForm(doc.form) || isUnmuteForm(doc.form) ) &&
          doc.fields &&
          ( doc.fields.patient_id || doc.fields.place_id || doc.fields.patient_uuid ) &&
          !transitionUtils.hasRun(info, TRANSITION_NAME));

const isRelevantContact = (doc, info = {}) =>
  Boolean(doc &&
          !info._rev &&
          ['person', 'clinic', 'health_center', 'district_hospital'].includes(doc.type) &&
          !doc.muted &&
          mutingUtils.isMutedInLineage(doc));

module.exports = {
  init: () => {
    const forms = getConfig()[MUTE_PROPERTY];
    if (!forms || !_.isArray(forms) || !forms.length) {
      throw new Error(`Configuration error. Config must define have a '${CONFIG_NAME}.${MUTE_PROPERTY}' array defined.`);
    }
  },

  filter: (doc, info = {}) => isRelevantReport(doc, info) || isRelevantContact(doc, info),

  onMatch: change => {
    if (change.doc.type !== 'data_record') {
      // new contacts that have muted parents should also get the muted flag
      mutingUtils.updateContact(change.doc, true);
      return mutingUtils
        .updateRegistrations(mutingUtils.getSubjectIds(change.doc), true)
        .then(() => true);
    }

    const muteState = isMuteForm(change.doc.form);
    let targetContact;

    return mutingUtils
      .getContact(change.doc)
      .then(contact => {
        targetContact = contact;

        if (Boolean(contact.muted) === muteState) {
          // don't update registrations if contact already has desired state
          module.exports._addMsg(contact.muted ? 'already_muted' : 'already_unmuted', change.doc);
          return;
        }

        return mutingUtils.updateMuteState(contact, muteState);
      })
      .then(result => {
        if (!result) {
          // no contacts or registrations have been updated
          return true;
        }

        module.exports._addMsg(getEventType(muteState), change.doc, targetContact);
        return true;
      })
      .catch(err => {
        if (err && err.message === 'contact_not_found') {
          module.exports._addErr('contact_not_found', change.doc);
          return true;
        }

        throw(err);
      });
  },
  _addMsg: function(eventType, doc, contact) {
    const msgConfig = _.findWhere(getConfig().messages, { event_type: eventType });

    if (msgConfig) {
      messages.addMessage(doc, msgConfig, msgConfig.recipient, { patient: contact });
    }
  },
  _addErr: function(eventType, doc) {
    const locale = utils.getLocale(doc),
          evConf = _.findWhere(getConfig().messages, { event_type: eventType });

    const msg = messages.getMessage(evConf, locale);
    if (msg) {
      messages.addError(doc, msg);
    } else {
      messages.addError(doc, `Failed to complete muting request, event type "${eventType}" misconfigured.`);
    }
  }
};
