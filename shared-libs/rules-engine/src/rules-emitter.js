/**
 * @module rules-emitter
 * Encapsulates interactions with the nools library
 * Handles marshaling of documents into nools facts
 * Promisifies the execution of partner "rules" code
 * Ensures memory allocated by nools is freed after each run
 */
const nools = require('nools');
const nootils = require('cht-nootils');
const registrationUtils = require('@medic/registration-utils');

let flow;

/**
* Sets the rules emitter to an uninitialized state.
*/
const shutdown = () => {
  nools.deleteFlows();
  flow = undefined;
};

module.exports = {
  /**
   * Initializes the rules emitter
   *
   * @param {Object} settings Settings for the behavior of the rules emitter
   * @param {Object} settings.rules Rules code from settings doc
   * @param {Object[]} settings.taskSchedules Task schedules from settings doc
   * @param {Object} settings.contact The logged in user's contact document
   * @returns {Boolean} Success
   */
  initialize: (settings) => {
    if (flow) {
      throw Error('Attempted to initialize the rules emitter multiple times.');
    }

    if (!settings.rules) {
      return false;
    }

    shutdown();

    try {
      const settingsDoc = { tasks: { schedules: settings.taskSchedules } };
      const nootilsInstance = nootils(settingsDoc);
      flow = nools.compile(settings.rules, {
        name: 'medic',
        scope: {
          Utils: nootilsInstance,
          user: settings.contact,
          cht: settings.chtScriptApi,
        },
      });
    } catch (err) {
      shutdown();
      throw err;
    }

    return !!flow;
  },

  /**
   * When upgrading to version 3.8, partners are required to make schema changes in their partner code
   * TODO: Add link to documentation
   *
   * @returns True if the schema changes are in place
   */
  isLatestNoolsSchema: () => {
    if (!flow) {
      throw Error('task emitter is not enabled -- cannot determine schema version');
    }

    const Task = flow.getDefined('task');
    const Target = flow.getDefined('target');
    const hasProperty = (obj, attr) => Object.hasOwnProperty.call(obj, attr);
    return hasProperty(Task.prototype, 'readyStart') &&
      hasProperty(Task.prototype, 'readyEnd') &&
      hasProperty(Target.prototype, 'contact');
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
    if (!flow) {
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

    const session = startSession();
    try {
      const facts = marshalDocsIntoNoolsFacts(contactDocs, reportDocs, taskDocs);
      facts.forEach(session.assert);
    } catch (err) {
      session.dispose();
      throw err;
    }

    return session.match();
  },

  /**
   * @returns True if the rules emitter is initialized and ready for use
   */
  isEnabled: () => !!flow,

  shutdown,
};

const startSession = function() {
  if (!flow) {
    throw Error('Failed to start task session. Not initialized');
  }

  const session = flow.getSession();
  const tasks = [];
  const targets = [];
  session.on('task', task => tasks.push(task));
  session.on('target', target => targets.push(target));

  return {
    assert: session.assert.bind(session),
    dispose: session.dispose.bind(session),

    // session.match can return a thenable but not a promise. so wrap it in a real promise
    match: () => new Promise((resolve, reject) => {
      session.match(err => {
        session.dispose();
        if (err) {
          return reject(err);
        }

        resolve({ tasks, targets });
      });
    }),
  };
};

const marshalDocsIntoNoolsFacts = (contactDocs, reportDocs, taskDocs) => {
  const Contact = flow.getDefined('contact');

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
