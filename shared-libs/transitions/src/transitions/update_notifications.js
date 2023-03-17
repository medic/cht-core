const _ = require('lodash');
const config = require('../config');
const utils = require('../lib/utils');
const messages = require('../lib/messages');
const transitionUtils = require('./utils');
const mutingUtils = require('../lib/muting_utils');
const logger = require('../lib/logger');
const NAME = 'update_notifications';

const getEventType = function(config, doc) {
  if (!config.on_form && !config.off_form) {
    // no configured on or off forms
    return false;
  }
  let mute;
  if (utils.isFormCodeSame(config.on_form, doc.form)) {
    mute = false;
  } else if (utils.isFormCodeSame(config.off_form, doc.form)) {
    mute = true;
  } else {
    // transition does not apply; return false
    return false;
  }

  return { mute: mute };
};

const getEventName = mute => mute.mute ? 'on_mute': 'on_unmute';

module.exports = {
  name: NAME,
  asynchronousOnly: true,
  deprecated: true,
  deprecatedIn: '3.2.x',
  init: () => {
    const self = module.exports;
    logger.warn(self.getDeprecationMessage());
  },
  getDeprecationMessage: () => {
    const self = module.exports;
    const deprecatedExtraInfo = 'Please use "muting" transition instead.';

    return transitionUtils.getDeprecationMessage(self.name, self.deprecatedIn, deprecatedExtraInfo);
  },
  _addErr: function(event_type, config, doc) {
    const locale = utils.getLocale(doc);
    const evConf = _.find(config.messages, { event_type: event_type });
    const msg = messages.getMessage(evConf, locale);
    if (msg) {
      messages.addError(doc, msg);
    } else {
      messages.addError(doc, `Failed to complete notification request, event type "${event_type}" misconfigured.`);
    }
  },
  _addMsg: function(event_type, config, doc, registrations, patient) {
    const msgConfig = _.find(config.messages, { event_type: event_type });
    if (msgConfig) {
      const templateContext = {
        registrations: registrations,
        patient: patient,
      };
      messages.addMessage(doc, msgConfig, msgConfig.recipient, templateContext);
    } else {
      module.exports._addErr(event_type, config, doc);
    }
  },
  filter: function({ doc, info }) {
    return Boolean(
      doc &&
      doc.form &&
      doc.type === 'data_record' &&
      !transitionUtils.hasRun(info, NAME) &&
      utils.isValidSubmission(doc)
    );
  },
  getConfig: function() {
    return Object.assign({}, config.get('notifications'));
  },
  onMatch: change => {
    const self = module.exports;
    const doc = change.doc;
    const config = module.exports.getConfig();
    const eventType = getEventType(config, doc);

    if (!eventType) {
      return Promise.resolve();
    }

    const contact = doc.patient || doc.place;

    return transitionUtils.validate(config, doc).then(errors => {
      if (errors && errors.length > 0) {
        messages.addErrors(config, doc, errors, { patient: doc.patient, place: doc.place });
        return true;
      }

      if (!contact) {
        self._addErr('patient_not_found', config, doc);
        self._addMsg('patient_not_found', config, doc);
        return true;
      }

      if (Boolean(contact.muted) === eventType.mute) {
        // don't update registrations if contact already has desired state
        self._addMsg(getEventName(eventType), config, doc, [], contact);
        return true;
      }

      return mutingUtils
        .updateMuteState(contact, eventType.mute, change.id)
        .then(() => {
          self._addMsg(getEventName(eventType), config, doc, [], contact);
          return true;
        });
    });
  }
};
