var matchedLastHistory = function(task, state) {
  if (!task.state_history.length) {
    return false;
  }

  return task.state_history[task.state_history.length - 1].state === state;
};

/**
 * Updates Task state, timestamp, gateway reference, state details and state history.
 * @returns {boolean} Returns true if task state or task history is changed, otherwise returns false.
 */
var setTaskState = function(task, state, details, gatewayRef) {
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
  setTaskState: setTaskState
};
