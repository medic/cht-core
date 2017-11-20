exports = function(task, state) {
  task.state = state;
  task.state_history = task.state_history || [];
  task.state_history.push({
    state: state,
    timestamp: new Date().toISOString()
  });
};
