const _ = require('underscore'),
      config = require('../config'),
      transitionUtils = require('./utils'),
      db = require('../db-pouch'),
      dbNano = require('../db-nano'),
      utils = require('../lib/utils'),
      messages = require('../lib/messages'),
      lineage = require('lineage')(Promise, db.medic);

const TRANSITION_NAME = 'muting',
      CONFIG_NAME = 'muting',
      MUTE_PROPERTY = 'mute_forms',
      UNMUTE_PROPERTY = 'unmute_forms';

const getConfig = () => {
  return config.get(CONFIG_NAME) || {};
};

const isMuteForm = form => {
  return getConfig()[MUTE_PROPERTY].includes(form);
};

const isUnmuteForm = form => {
  const unmuteForms = getConfig()[UNMUTE_PROPERTY];
  return unmuteForms && unmuteForms.includes(form);
};

const getContact = doc => {
  const contactId = doc.fields.patient_id || doc.fields.place_id;

  return db.medic
    .allDocs({ key: contactId })
    .then(result => {
      if (!result.rows.length) {
        return db.medic.query('medic-client/contacts_by_reference', { key: [ 'shortcode', contactId ] });
      }
      return result;
    })
    .then(result => {
      if (!result.rows.length) {
        module.exports._addErr('contact_not_found', doc);
        throw(new Error('Contact not found'));
      }
      return lineage.fetchHydratedDoc(result.rows[0].id);
    });
};

const getDescendants = (contactIds = []) => {
  if (typeof contactIds === 'string') {
    contactIds = [contactIds];
  }

  return db.medic.query('medic/contacts_by_depth', { keys: contactIds.map(contactId => ([contactId])) });
};

const updateRegistration = (registration, muted) => {
  let registrationChanged;
  if (muted) {
    registrationChanged = utils.muteScheduledMessages(registration);
  } else {
    registrationChanged = utils.unmuteScheduledMessages(registration);
  }

  if (!registrationChanged) {
    return;
  }

  return registration;
};

const updateContacts = (contacts, muted) => {
  contacts.forEach(contact => contact.muted = muted);
  return db.medic.bulkDocs(contacts);
};

const updateRegistrations = (patientIds, muted) => {
  if (!patientIds || !patientIds.length) {
    return [];
  }

  const updatedRegistrations = [];

  return new Promise((resolve, reject) => {
      utils.getRegistrations({ ids: patientIds, db: dbNano }, (err, registrations) => {
        if (err) {
          return reject(err);
        }

        resolve(registrations);
      });
    })
    .then(registrations => {
      if (!registrations.length) {
        return;
      }

      registrations.forEach(registration => {
        const updatedRegistration = updateRegistration(registration, muted);
        if (updatedRegistration) {
          updatedRegistrations.push(updatedRegistration);
        }
      });

      if (!updatedRegistrations.length) {
        return;
      }

      return db.medic.bulkDocs(updatedRegistrations);
    })
    .then(() => updatedRegistrations);
};

const getEventType = muted => muted ? 'mute' : 'unmute';

const getContactsAndPatientIds = (doc, contact, muted) => {
  if (contact.muted === muted) {
    // don't update registrations if contact already has desired state
    module.exports._addErr(contact.muted ? 'already_muted' : 'already_unmuted', doc);
    return;
  }

  let rootContactId;
  const patientIds = [];

  if (muted) {
    rootContactId = contact._id;
  } else {
    let parent = contact;
    while (parent && parent.muted) {
      rootContactId = parent._id;
      parent = parent.parent;
    }
  }

  return getDescendants(rootContactId)
    .then(descendants => {
      const contactIds = [];
      descendants.rows.forEach(descendant => {
        contactIds.push(descendant.id);
        if (descendant.value) {
          patientIds.push(descendant.value);
        }
      });

      return db.medic.allDocs({ keys: contactIds, include_docs: true });
    })
    .then(result => {
      const contacts = [];
      result.rows.forEach(row => {
        if (row.doc && Boolean(row.doc.muted) !== muted) {
          contacts.push(row.doc);
        }
      });

      return { contacts, patientIds };
    });
};

module.exports = {
  init: () => {
    const forms = getConfig()[MUTE_PROPERTY];
    if (!forms || !_.isArray(forms) || !forms.length) {
      throw new Error(`Configuration error. Config must define have a '${CONFIG_NAME}.${MUTE_PROPERTY}' array defined.`);
    }
  },
  filter: (doc, info = {}) => {
    return Boolean(doc &&
                   doc.form &&
                   doc.type === 'data_record' &&
                   ( isMuteForm(doc.form) || isUnmuteForm(doc.form) ) &&
                   doc.fields &&
                   ( doc.fields.patient_id || doc.fields.place_id ) &&
                   !transitionUtils.hasRun(info, TRANSITION_NAME));

  },
  onMatch: change => {
    const muting = isMuteForm(change.doc.form);
    let targetContact;

    return getContact(change.doc)
      .then(contact => getContactsAndPatientIds(change.doc, contact, muting))
      .then(result => {
        if (!result) {
          // no contacts or registrations need updating
          return true;
        }

        return updateContacts(result.contacts, muting)
          .then(() => updateRegistrations(result.patientIds, muting))
          .then(registrations => {
            module.exports._addMsg(getEventType(muting), change.doc, registrations, targetContact);
            return true;
          });
      });
  },
  _addMsg: function(eventType, doc, registrations, contact) {
    const msgConfig = _.findWhere(getConfig().messages, { event_type: eventType });

    if (msgConfig) {
      const templateContext = {
        registrations: registrations,
        patient: contact
      };
      messages.addMessage(doc, msgConfig, msgConfig.recipient, templateContext);
    }

    return true;
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

    return true;
  },

  _lineage: lineage
};
