/**
 * @module transform-task-emission-to-doc
 * Transforms a task emission into the schema used by task documents
 * Minifies all unneeded data from the emission
 * Merges emission data into an existing document, or creates a new task document (as appropriate)
 */

const _ = require('lodash');
const TaskStates = require('./task-states');

/**
 * @param {Object} taskEmission A task emission from the rules engine
 * @param {int} calculatedAt Epoch timestamp at the time the emission was calculated
 * @param {Object} existingDoc The most recent taskDocument with the same emission id

 * @returns {Object} result
 * @returns {Object} result.taskDoc The result of the transformation
 * @returns {Boolean} result.isUpdated True if the document is new or has been altered
 */
module.exports = (taskEmission, calculatedAt, userContactId, existingDoc) => {
  let emittedState = TaskStates.calculateState(taskEmission, calculatedAt);
  const baseFromExistingDoc = !!existingDoc && (!TaskStates.isTerminal(existingDoc.state) || existingDoc.state === emittedState);

  const taskDoc = baseFromExistingDoc ? deepCopy(existingDoc) : newTaskDoc(taskEmission, userContactId, calculatedAt);
  taskDoc.user = userContactId;
  taskDoc.requester = taskEmission.doc && taskEmission.doc.contact && taskEmission.doc.contact._id;
  taskDoc.owner = taskEmission.contact && taskEmission.contact._id;
  minifyEmission(taskDoc, taskEmission);
  TaskStates.setStateOnTaskDoc(taskDoc, emittedState, calculatedAt);

  const isUpdated =
    // do not create new documents where the initial state is cancelled (invalid emission)
    (baseFromExistingDoc || taskDoc.state !== TaskStates.Cancelled)
    && (
      !existingDoc ||
      existingDoc._id !== taskDoc._id ||
      (
        !TaskStates.isTerminal(existingDoc.state) &&  // reduce document churn - don't tweak data on docs in terminal states
        JSON.stringify(taskDoc) !== JSON.stringify(existingDoc)
      )
    );

  return {
    isUpdated,
    taskDoc,
  };
};

const minifyEmission = (taskDoc, emission) => {
  const minified = _.pick(emission, '_id', 'title', 'icon', 'startTime', 'endTime', 'deleted', 'resolved', 'actions');

  /*
  The declarative configuration "contactLabel" results in a task emission with a contact with only a name attribute.
  For backward compatibility, contacts which don't provide an id should not be minified and rehydrated.
  */
  if (emission.contact) {
    minified.contact = { name: emission.contact.name };
  }

  minified.dueDate = emission.date && new Date(emission.date).getTime();
  minified.actions && minified.actions
    .filter(action => action && action.content)
    .forEach(action => {
      if (!minified.forId) {
        minified.forId = action.content.contact && action.content.contact._id;
      }
      delete action.content.contact;
    });

  taskDoc.emission = minified;
  return taskDoc;
};

const deepCopy = obj => JSON.parse(JSON.stringify(obj));
const newTaskDoc = (emission, userContactId, calculatedAt) => ({
  _id: `task~${userContactId}~${emission._id}~${calculatedAt}`,
  type: 'task',
  authoredOn: calculatedAt,
  stateHistory: [],
});
