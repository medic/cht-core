/**
 * @module rules-emitter
 * Handles the lifecycle of a @RulesEmitter and marshales of documents into the emitter by contact
 * 
 * @typedef {Object} RulesEmitter Responsible for executing the logic in _rules_ and returning _emissions_
 */
const nootils = require('cht-nootils');
const registrationUtils = require('@medic/registration-utils');

const javascriptEmitter = require('./emitter.javascript');
const noolsEmitter = require('./emitter.nools');

let emitter;

/**
* Sets the rules emitter to an uninitialized state.
*/
const shutdown = () => {
  if (emitter) {
    emitter.shutdown();
  }

  emitter = undefined;
};

module.exports = {
  /**
   * Initializes the rules emitter
   *
   * @param {Object} settings Settings for the behavior of the rules emitter
   * @param {Object} settings.rules Rules code from settings doc
   * @param {Object[]} settings.taskSchedules Task schedules from settings doc
   * @param {Boolean} [settings.rulesAreDeclarative=true] Flag to indicate the content of settings.rules. When true, 
   * rules is processed as native JavaScript. When false, nools is used.
   * @param {RulesEmitter} [settings.customEmitter] Optional custom RulesEmitter object
   * @param {Object} settings.contact The logged in user's contact document
   * @returns {Boolean} Success
   */
  initialize: (settings) => {
    if (emitter) {
      throw Error('Attempted to initialize the rules emitter multiple times.');
    }

    if (!settings.rules) {
      return false;
    }

    shutdown();
    emitter = resolveEmitter(settings);

    try {
      const settingsDoc = { tasks: { schedules: settings.taskSchedules } };
      const nootilsInstance = nootils(settingsDoc);
      const scope = {
        Utils: nootilsInstance,
        user: settings.contact,
        cht: settings.chtScriptApi,
      };
      return emitter.initialize(settings, scope);
    } catch (err) {
      shutdown();
      throw err;
    }
  },

  /**
   * When upgrading to version 3.8, partners are required to make schema changes in their partner code
   * https://docs.communityhealthtoolkit.org/core/releases/3.8.0/#breaking-changes
   *
   * @returns True if the schema changes are in place
   */
  isLatestNoolsSchema: () => {
    if (!emitter) {
      throw Error('task emitter is not enabled -- cannot determine schema version');
    }

    return emitter.isLatestNoolsSchema();
  },

  /**
   * Runs the partner's rules code for a set of documents and returns all emissions from nools
   *
   * @param {Object[]} contactDocs A set of contact documents
   * @param {Object[]} reportDocs All of the contacts' reports
   * @param {Object[]} taskDocs All of the contacts' task documents (must be linked by requester to a contact)
   *
   * @returns {Promise<Object>} emissions The raw emissions from nools
   * @returns {Object[]} emissions.tasks Array of task emissions
   * @returns {Object[]} emissions.targets Array of target emissions
   */
  getEmissionsFor: (contactDocs, reportDocs = [], taskDocs = []) => {
    if (!emitter) {
      throw Error('task emitter is not enabled -- cannot get emissions');
    }

    if (!Array.isArray(contactDocs)) {
      throw Error('invalid argument: contactDocs is expected to be an array');
    }

    if (!Array.isArray(reportDocs)) {
      throw Error('invalid argument: reportDocs is expected to be an array');
    }

    if (!Array.isArray(taskDocs)) {
      throw Error('invalid argument: taskDocs is expected to be an array');
    }

    const session = emitter.startSession();
    try {
      const Contact = emitter.getContact();
      const docsByContact = marshalDocsByContact(Contact, contactDocs, reportDocs, taskDocs);
      docsByContact.forEach(session.processDocsByContact);
    } catch (err) {
      session.dispose();
      throw err;
    }

    return session.result();
  },

  /**
   * @returns True if the rules emitter is initialized and ready for use
   */
  isEnabled: () => !!emitter,

  shutdown,
};

const marshalDocsByContact = (Contact, contactDocs, reportDocs, taskDocs) => {
  const factByContactId = contactDocs.reduce((agg, contact) => {
    agg[contact._id] = new Contact({ contact, reports: [], tasks: [] });
    return agg;
  }, {});

  const factBySubjectId = contactDocs.reduce((agg, contactDoc) => {
    const subjectIds = registrationUtils.getSubjectIds(contactDoc);
    for (const subjectId of subjectIds) {
      if (!agg[subjectId]) {
        agg[subjectId] = factByContactId[contactDoc._id];
      }
    }
    return agg;
  }, {});

  const addHeadlessContact = (contactId) => {
    const contact = contactId ? { _id: contactId } : undefined;
    const newFact = new Contact({ contact, reports: [], tasks: [] });
    factByContactId[contactId] = factBySubjectId[contactId] = newFact;
    return newFact;
  };

  for (const report of reportDocs) {
    const subjectIdInReport = registrationUtils.getSubjectId(report);
    const factOfPatient = factBySubjectId[subjectIdInReport] || addHeadlessContact(subjectIdInReport);
    factOfPatient.reports.push(report);
  }

  if (Object.hasOwnProperty.call(Contact.prototype, 'tasks')) {
    for (const task of taskDocs) {
      const sourceId = task.requester;
      const factOfPatient = factBySubjectId[sourceId] || addHeadlessContact(sourceId);
      factOfPatient.tasks.push(task);
    }
  }

  return Object.keys(factByContactId).map(key => {
    factByContactId[key].reports = factByContactId[key].reports.sort((a, b) => a.reported_date - b.reported_date);
    return factByContactId[key];
  }); // Object.values(factByContactId)
};

const resolveEmitter = (settings = {}) => {
  const { rulesAreDeclarative, customEmitter } = settings;
  if (customEmitter !== null && typeof customEmitter === 'object') {
    return customEmitter;
  }
  
  return rulesAreDeclarative ? javascriptEmitter : noolsEmitter;
};
