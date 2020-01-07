/**
 * @module update-temporal-states
 * As time elapses, documents change state because the timing window has been reached.
 * Eg. Documents with state Draft move to state Ready just because it is now after midnight
 */
const TaskStates = require('./task-states');

/**
 * @param {Object[]} taskDocs A list of task documents to evaluate
 * @param {int} timestamp=Date.now() Epoch timestamp to use when evaluating the current state of the task documents
 */
module.exports = (taskDocs, timestamp = Date.now()) => {
  const docsToCommit = [];
  for (const taskDoc of taskDocs) {
    let updatedState = TaskStates.calculateState(taskDoc.emission, timestamp);
    if (taskDoc.authoredOn > timestamp) {
      updatedState = TaskStates.Cancelled;
    }

    if (!TaskStates.isTerminal(taskDoc.state) && taskDoc.state !== updatedState) {
      TaskStates.setStateOnTaskDoc(taskDoc, updatedState, timestamp);
      docsToCommit.push(taskDoc);
    }
  }

  return docsToCommit;
};
