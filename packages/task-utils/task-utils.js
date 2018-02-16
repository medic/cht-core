var matchedLastHistory = function(task, state) {
  if (!task.state_history.length) {
    return false;
  }

  return task.state_history[task.state_history.length - 1].state === state;
};

var setTaskState = function(task, state, details) {
  var timestamp = (new Date()).toISOString();

  task.timestamp = timestamp;
  task.state_history = task.state_history || [];

  if (task.state === state && (!details || task.state_details === details) && matchedLastHistory(task, state)) {
    task.state_history[task.state_history.length - 1].timestamp = timestamp;
    return false;
  }

  task.state = state;
  task.state_details = details;
  task.state_history.push({
    state: state,
    state_details: details,
    timestamp: timestamp
  });

  return true;
};

module.exports = {
  setTaskState: setTaskState
};
