/**
 * @module task-states
 * As defined by the FHIR task standard https://www.hl7.org/fhir/task.html#statemachine
 */

const moment = require('moment');

/**
 * Problems:
 * If all emissions are converted to documents, heavy users will create thousands of legacy task docs after upgrading to this rules-engine.
 * In order to purge task documents, we need to guarantee that they won't just be recreated after they are purged.
 * The two scenarios above are important for maintaining the client-side performance of the app.
 * 
 * Therefore, we only consider task emissions "timely" if they end within a fixed time period.
 * However, if this window is too short then users who don't login frequently may fail to create a task document at all.
 * Looking at time-between-reports for active projects, a time window of 60 days will ensure that 99.9% of tasks are recorded as docs.
 */
const TIMELY_WHEN_NEWER_THAN_DAYS = 60;

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
  const hasExistingDisplayWindow = taskEmission.startTime || taskEmission.endTime;
  if (hasExistingDisplayWindow) {
    return {
      dueDate: taskEmission.dueDate,
      startTime: taskEmission.startTime,
      endTime: taskEmission.endTime,
    };
  }

  const dueDate = moment(taskEmission.date);
  return {
    dueDate: dueDate.valueOf(),
    startTime: dueDate.clone().startOf('day').subtract(taskEmission.readyStart || 0, 'days').valueOf(),
    endTime: dueDate.clone().startOf('day').add(taskEmission.readyEnd || 0, 'days').add(1, 'day').valueOf() - 1,
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
    if (!taskEmission.date && !Number.isInteger(taskEmission.dueDate)) {
      return false;
    }

    const { startTime, endTime } = getDisplayWindow(taskEmission);
    if (!Number.isInteger(startTime) || !Number.isInteger(endTime) || startTime > endTime || endTime < startTime) {
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

  isTimely: (taskEmission, timestamp) => {
    const { endTime } = getDisplayWindow(taskEmission);
    return endTime > moment(timestamp).add(-TIMELY_WHEN_NEWER_THAN_DAYS, 'days').valueOf();
  },

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
