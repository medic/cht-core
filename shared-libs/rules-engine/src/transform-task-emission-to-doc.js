/**
 * @module transform-task-emission-to-doc
 * Transforms a task emission into the schema used by task documents
 * Minifies all unneeded data from the emission
 * Merges emission data into an existing document, or creates a new task document (as appropriate)
 */

const TaskStates = require('./task-states');

/**
 * @param {Object} taskEmission A task emission from the rules engine
 * @param {int} calculatedAt Epoch timestamp at the time the emission was calculated
 * @param {Object} existingDoc The most recent taskDocument with the same emission id

 * @returns {Object} result
 * @returns {Object} result.taskDoc The result of the transformation
 * @returns {Boolean} result.isUpdated True if the document is new or has been altered
 */
module.exports = (taskEmission, calculatedAt, userSettingsId, existingDoc) => {
  const emittedState = TaskStates.calculateState(taskEmission, calculatedAt);
  const baseFromExistingDoc = !!existingDoc &&
    (!TaskStates.isTerminal(existingDoc.state) || existingDoc.state === emittedState);

  // reduce document churn - don't tweak data on existing docs in terminal states
  const baselineStateOfExistingDoc = baseFromExistingDoc &&
                                     !TaskStates.isTerminal(existingDoc.state) &&
                                     JSON.stringify(existingDoc);
  const taskDoc = baseFromExistingDoc ? existingDoc : newTaskDoc(taskEmission, userSettingsId, calculatedAt);
  taskDoc.user = userSettingsId;
  taskDoc.requester = taskEmission.doc && taskEmission.doc.contact && taskEmission.doc.contact._id;
  taskDoc.owner = taskEmission.contact && taskEmission.contact._id;
  minifyEmission(taskDoc, taskEmission);
  TaskStates.setStateOnTaskDoc(taskDoc, emittedState, calculatedAt);

  const isUpdated = (() => {
    if (!baseFromExistingDoc) {
      // do not create new documents where the initial state is cancelled (invalid emission)
      return taskDoc.state !== TaskStates.Cancelled;
    }

    return baselineStateOfExistingDoc && JSON.stringify(taskDoc) !== baselineStateOfExistingDoc;
  })();

  return {
    isUpdated,
    taskDoc,
  };
};

const minifyEmission = (taskDoc, emission) => {
  const minified = ['_id', 'title', 'icon', 'deleted', 'resolved', 'actions', 'priority', 'priorityLabel' ]
    .reduce((agg, attr) => {
      if (Object.hasOwnProperty.call(emission, attr)) {
        agg[attr] = emission[attr];
      }
      return agg;
    }, {});

  /*
  The declarative configuration "contactLabel" results in a task emission with a contact with only a name attribute.
  For backward compatibility, contacts which don't provide an id should not be minified and rehydrated.
  */
  if (emission.contact) {
    minified.contact = { name: emission.contact.name };
  }

  if (emission.date || emission.dueDate) {
    const timeWindow = TaskStates.getDisplayWindow(emission);
    Object.assign(minified, timeWindow);
  }
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

const newTaskDoc = (emission, userSettingsId, calculatedAt) => ({
  _id: `task~${userSettingsId}~${emission._id}~${calculatedAt}`,
  type: 'task',
  authoredOn: calculatedAt,
  stateHistory: [],
});
