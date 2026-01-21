/**
 * @module task-utils
 */
const moment = require('moment');
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

/**
 * Sort tasks by due date and priority
 * Sorting rules (in order):
 * 1. Valid priorities sort first (higher value = higher priority)
 * 2. Equal priorities sort by due date (earlier = higher priority)
 * 3. Invalid/missing values sort last while maintaining original order
 */
const orderByDueDateAndPriority = (t1, t2) => {
  const getDueDate = dueDate => {
    if (typeof dueDate !== 'number' && typeof dueDate !== 'string') {
      return Number.NaN;
    }
    const numericDate = Number(dueDate);
    if (!Number.isNaN(numericDate)) {
      return numericDate;
    }
    // If not a number, try parsing as date
    if (moment(dueDate).isValid()) {
      return moment(dueDate).valueOf();
    }
    return Number.NaN;
  };
  const getPriorityValue = priority => {
    if (typeof priority === 'number' && priority >= 0) {
      return priority;
    }
    return Number.NaN;
  };

  const lhsDate = getDueDate(t1?.dueDate);
  const rhsDate = getDueDate(t2?.dueDate);
  const lhsPriority = getPriorityValue(t1?.priority);
  const rhsPriority = getPriorityValue(t2?.priority);

  const compareDates = () => {
    // Both dates invalid, maintain original order
    if (Number.isNaN(lhsDate) && Number.isNaN(rhsDate)) {
      return 0;
    }
    // Move tasks without dates to end
    if (Number.isNaN(lhsDate)) {
      return 1;
    }
    if (Number.isNaN(rhsDate)) {
      return -1;
    }
    // Sort by date ascending
    return lhsDate - rhsDate;
  };

  // Priority comparison cascade
  if (Number.isNaN(lhsPriority) && Number.isNaN(rhsPriority)) {
    return compareDates(); // Both priorities invalid, sort by date
  }

  // Move tasks without valid priorities to end
  if (Number.isNaN(lhsPriority)) {
    return 1;
  }
  if (Number.isNaN(rhsPriority)) {
    return -1;
  }

  // Both priorities are valid, sort in descending order
  if (lhsPriority !== rhsPriority) {
    return rhsPriority - lhsPriority;
  }

  // Same priority, sort by date
  return compareDates();
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
  setTaskState: (task, state, details, gatewayRef) => setTaskState(task, state, details, gatewayRef),
  orderByDueDateAndPriority: (t1, t2) => orderByDueDateAndPriority(t1, t2)
};
