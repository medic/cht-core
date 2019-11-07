/**
 * @module task-states
 * As defined by the FHIR task standard https://www.hl7.org/fhir/task.html#statemachine
 */

const moment = require('moment');

const States = {
  /**
   * Task has been calculated but it is scheduled in the future
   */
  Draft: 'Draft',

  /**
   * Task is currently showing to the user
   */
  Ready: 'Ready',

  /**
   * Task was not emitted when refreshing the contact
   * Task resulted from invalid emissions
   */
  Cancelled: 'Cancelled',

  /**
   * Task was emitted with { resolved: true }
   */
  Completed: 'Completed',

  /**
   * Task was never terminated and is now outside the allowed time window
   */
  Failed: 'Failed',
};

const getDisplayWindow = (taskEmission) => {
  const noolsSchema = ['date', 'displayDaysBefore', 'displayDaysAfter'].some(attr => Object.hasOwnProperty.call(taskEmission, attr));
  if (noolsSchema) {
    const dueDate = moment(taskEmission.date).startOf('day');
    return {
      dueDate: dueDate.valueOf(),
      startTime: dueDate.clone().subtract(taskEmission.displayDaysBefore || 0, 'days').valueOf(),
      endTime: dueDate.clone().add(taskEmission.displayDaysAfter || 0, 'days').add(1, 'day').valueOf() - 1,
    };
  }

  // if not nools schema, the emission is in the task document schema
  return {
    dueDate: taskEmission.dueDate,
    startTime: taskEmission.startTime,
    endTime: taskEmission.endTime,
  };
};


module.exports = {
  isTerminal: state => [States.Cancelled, States.Completed, States.Failed].includes(state),

  isMoreReadyThan: (stateA, stateB) => {
    const mostReadyOrder = [States.Ready, States.Draft, States.Completed, States.Failed, States.Cancelled];
    const orderOf = state => {
      const order = mostReadyOrder.indexOf(state);
      return order >= 0 ? order : mostReadyOrder.length;
    };
    return orderOf(stateA) < orderOf(stateB);
  },

  calculateState: (taskEmission, time) => {
    if (!taskEmission) {
      return false;
    }

    if (taskEmission.resolved) {
      return States.Completed;
    }

    if (taskEmission.deleted) {
      return States.Cancelled;
    }

    // invalid data yields falsey
    if (!taskEmission.date && !taskEmission.dueDate) {
      return false;
    }

    const { startTime, endTime } = getDisplayWindow(taskEmission);
    if (!startTime || !endTime || startTime > endTime || endTime < startTime) {
      return false;
    }

    if (startTime > time) {
      return States.Draft;
    }

    if (endTime < time) {
      return States.Failed;
    }

    return States.Ready;
  },

  getDisplayWindow,

  setStateOnTaskDoc: (taskDoc, updatedState, timestamp = Date.now()) => {
    if (!taskDoc) {
      return;
    }

    if (!updatedState) {
      taskDoc.state = States.Cancelled;
      taskDoc.stateReason = 'invalid';
    } else {
      taskDoc.state = updatedState;
    }

    const stateHistory = taskDoc.stateHistory = taskDoc.stateHistory || [];
    const mostRecentState = stateHistory[stateHistory.length - 1];
    if (!mostRecentState || taskDoc.state !== mostRecentState.state) {
      const stateChange = { state: taskDoc.state, timestamp };
      stateHistory.push(stateChange);
    }

    return taskDoc;
  },
};

Object.assign(module.exports, States);
