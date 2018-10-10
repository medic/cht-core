const _ = require('underscore'),
      config = require('../config'),
      transitionUtils = require('./utils'),
      db = require('../db-pouch'),
      utils = require('../lib/utils'),
      messages = require('../lib/messages'),
      lineage = require('lineage')(Promise, db.medic);

const TRANSITION_NAME = 'muting',
      CONFIG_NAME = 'muting',
      MUTE_PROPERTY = 'mute_forms',
      UNMUTE_PROPERTY = 'unmute_forms',
      SUBJECT_PROPERTIES = ['_id', 'patient_id', 'place_id'];

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

const getDescendants = (contactId) => {
  return db.medic
    .query('medic/contacts_by_depth', { key: [contactId] })
    .then(result => result.rows.map(row => row.id));
};

const updateDataRecord = (dataRecord, muted) => {
  return muted ? utils.muteScheduledMessages(dataRecord) : utils.unmuteScheduledMessages(dataRecord);
};

const updateContacts = (contacts, muted) => {
  contacts = contacts.filter(contact => {
    if (Boolean(contact.muted) === muted) {
      return false;
    }
    contact.muted = muted;
    return true;
  });

  if (!contacts.length) {
    return;
  }

  return db.medic.bulkDocs(contacts);
};

const updateDataRecords = (subjectIds, muted) => {
  if (!subjectIds.length) {
    return Promise.resolve([]);
  }

  let updatedRecords;
  return utils.getReportsBySubject({ db: db.medic, ids: subjectIds, registrations: true })
    .then(dataRecords => {
      updatedRecords = dataRecords.filter(dataRecord => updateDataRecord(dataRecord, muted));
      if (!updatedRecords.length) {
        return;
      }

      return db.medic.bulkDocs(updatedRecords);
    })
    .then(() => updatedRecords);
};

const getEventType = muted => muted ? 'mute' : 'unmute';

const getContactsAndPatientIds = (doc, contact, muted) => {
  if (Boolean(contact.muted) === muted) {
    // don't update registrations if contact already has desired state
    module.exports._addErr(contact.muted ? 'already_muted' : 'already_unmuted', doc);
    return;
  }

  let rootContactId;
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
    .then(contactIds => db.medic.allDocs({ keys: contactIds, include_docs: true }))
    .then(result => {
      const contacts   = [],
            subjectIds = [];

      result.rows.forEach(row => {
        if (!row.doc) {
          return;
        }
        contacts.push(row.doc);
        subjectIds.push(..._.values(_.pick(row.doc, SUBJECT_PROPERTIES)));
      });

      return { contacts, subjectIds };
    });
};

const isRelevantReport = (doc, info ={}) =>
  Boolean(doc &&
          doc.form &&
          doc.type === 'data_record' &&
          ( isMuteForm(doc.form) || isUnmuteForm(doc.form) ) &&
          doc.fields &&
          ( doc.fields.patient_id || doc.fields.place_id ) &&
          !transitionUtils.hasRun(info, TRANSITION_NAME));

const isRelevantContact = doc =>
  Boolean(doc &&
          ['person', 'clinic', 'health_center', 'district_hospital'].includes(doc.type) &&
          !doc.muted &&
          utils.isMutedInLineage(doc));

module.exports = {
  init: () => {
    const forms = getConfig()[MUTE_PROPERTY];
    if (!forms || !_.isArray(forms) || !forms.length) {
      throw new Error(`Configuration error. Config must define have a '${CONFIG_NAME}.${MUTE_PROPERTY}' array defined.`);
    }
  },

  filter: (doc, info = {}) => isRelevantReport(doc, info) || isRelevantContact(doc),

  onMatch: change => {
    if (change.doc.type !== 'data_record') {
      // new contacts that have muted parents should also get the muted flag
      change.doc.muted = true;
      return updateDataRecords(_.values(_.pick(change.doc, SUBJECT_PROPERTIES)), true).then(() => true);
    }

    const muting = isMuteForm(change.doc.form);
    let targetContact;

    return getContact(change.doc)
      .then(contact => getContactsAndPatientIds(change.doc, contact, muting))
      .then(result => {
        if (!result) {
          // no contacts or registrations need updating
          return true;
        }

        return Promise
          .all([
            updateContacts(result.contacts, muting),
            updateDataRecords(result.subjectIds, muting)
          ])
          .then(([ contacts, dataRecords ]) => {
            module.exports._addMsg(getEventType(muting), change.doc, dataRecords, targetContact);
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

  _lineage: lineage,
  _getContactsAndPatientIds: getContactsAndPatientIds,
  _updateContacts: updateContacts,
  _updateDataRecords: updateDataRecords
};
