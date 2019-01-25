const _ = require('underscore'),
      config = require('../config'),
      transitionUtils = require('./utils'),
      utils = require('../lib/utils'),
      messages = require('../lib/messages'),
      validation = require('../lib/validation'),
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
          !transitionUtils.hasRun(info, TRANSITION_NAME));

// when new contacts are added that have muted parents, they should be set have muted state as well
// also the schedule associated with their registration should be muted
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

  validate: function(doc) {
    const config = getConfig(),
          validations = config.validations && config.validations.list;

    return new Promise(resolve => {
      validation.validate(doc, validations, (errors) => {
        if (errors && errors.length) {
          messages.addErrors(config, doc, errors, { patient: doc.patient });
          return resolve(false);
        }

        resolve(true);
      });
    });
  },

  onMatch: change => {
    if (change.doc.type !== 'data_record') {
      // process new contacts
      const muted = new Date();
      mutingUtils.updateContact(change.doc, muted);
      return mutingUtils
        .updateRegistrations(utils.getSubjectIds(change.doc), muted)
        .then(() => mutingUtils.updateMutingHistory(change.doc, muted))
        .then(() => true);
    }

    const muteState = isMuteForm(change.doc.form);
    let targetContact;

    return module.exports
      .validate(change.doc)
      .then(valid => {
        if (!valid) {
          return;
        }

        return mutingUtils
          .getContact(change.doc)
          .then(contact => {
            targetContact = contact;

            if (Boolean(contact.muted) === muteState) {
              // don't update registrations if contact already has desired state
              module.exports._addMsg(contact.muted ? 'already_muted' : 'already_unmuted', change.doc);
              return;
            }

            return mutingUtils.updateMuteState(contact, muteState, change.id);
          });
      })
      .then(changed => changed && module.exports._addMsg(getEventType(muteState), change.doc, targetContact))
      .catch(err => {
        if (err && err.message === 'contact_not_found') {
          module.exports._addErr('contact_not_found', change.doc);
          module.exports._addMsg('contact_not_found', change.doc);
          return;
        }

        throw(err);
      })
      .then(() => true);
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
