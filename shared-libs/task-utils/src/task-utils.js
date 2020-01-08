/**
 * @module task-utils
 */
const matchedLastHistory = function(task, state) {
  if (!task.state_history.length) {
    return false;
  }

  return task.state_history[task.state_history.length - 1].state === state;
};

const setTaskState = function(task, state, details, gatewayRef) {
  task.state_history = task.state_history || [];

  if (
    task.state === state &&
    matchedLastHistory(task, state) &&
    (!details || task.state_details === details) &&
    (!gatewayRef || task.gateway_ref === gatewayRef)
  ) {
    return false;
  }

  task.state = state;
  task.state_details = details;
  task.gateway_ref = gatewayRef;
  task.state_history.push({
    state: state,
    state_details: details,
    timestamp: (new Date()).toISOString()
  });

  return true;
};

module.exports = {
  /**
   * Updates Task state, timestamp, gateway reference, state details and state history.
   * @param {Object} task The task to update
   * @param {String} state The state to change to
   * @param {String} [details] Any additional information about the state change.
   * @param {String} [gatewayRef] The gateway ID
   * @returns {boolean} Returns true if task state or task history is changed, otherwise returns false.
   */
  setTaskState: (task, state, details, gatewayRef) => setTaskState(task, state, details, gatewayRef)
};
