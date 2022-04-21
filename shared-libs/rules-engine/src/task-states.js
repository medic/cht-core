/**
 * @module task-states
 * As defined by the FHIR task standard https://www.hl7.org/fhir/task.html#statemachine
 */

const moment = require('moment');

/**
 * Problems:
 * If all emissions are converted to documents, heavy users will create thousands of legacy task docs after upgrading
 * to this rules-engine.
 * In order to purge task documents, we need to guarantee that they won't just be recreated after they are purged.
 * The two scenarios above are important for maintaining the client-side performance of the app.
 *
 * Therefore, we only consider task emissions "timely" if they end within a fixed time period.
 * However, if this window is too short then users who don't login frequently may fail to create a task document at all.
 * Looking at time-between-reports for active projects, a time window of 60 days will ensure that 99.9% of tasks are
 * recorded as docs.
 */
const TIMELY_WINDOW = {
  start: 60, // days
  end: 180 // days
};

// This must be a comparable string format to avoid a bunch of parsing. For example, "2000-01-01" < "2010-11-31"
const formatString = 'YYYY-MM-DD';

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
  const hasExistingDisplayWindow = taskEmission.startDate || taskEmission.endDate;
  if (hasExistingDisplayWindow) {
    return {
      dueDate: taskEmission.dueDate,
      startDate: taskEmission.startDate,
      endDate: taskEmission.endDate,
    };
  }

  const dueDate = moment(taskEmission.date);
  if (!dueDate.isValid()) {
    return { dueDate: NaN, startDate: NaN, endDate: NaN };
  }

  return {
    dueDate: dueDate.format(formatString),
    startDate: dueDate.clone().subtract(taskEmission.readyStart || 0, 'days').format(formatString),
    endDate: dueDate.clone().add(taskEmission.readyEnd || 0, 'days').format(formatString),
  };
};

const mostReadyOrder = [States.Ready, States.Draft, States.Completed, States.Failed, States.Cancelled];
const orderOf = state => {
  const order = mostReadyOrder.indexOf(state);
  return order >= 0 ? order : mostReadyOrder.length;
};

module.exports = {
  isTerminal: state => [States.Cancelled, States.Completed, States.Failed].includes(state),

  isMoreReadyThan: (stateA, stateB) => orderOf(stateA) < orderOf(stateB),

  compareState: (stateA, stateB) => orderOf(stateA) - orderOf(stateB),

  calculateState: (taskEmission, timestamp) => {
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

    const { startDate, endDate } = getDisplayWindow(taskEmission);
    if (!startDate || !endDate || startDate > endDate || endDate < startDate) {
      return false;
    }

    const timestampAsDate = moment(timestamp).format(formatString);
    if (startDate > timestampAsDate) {
      return States.Draft;
    }

    if (endDate < timestampAsDate) {
      return States.Failed;
    }

    return States.Ready;
  },

  getDisplayWindow,

  states: States,

  isTimely: (taskEmission, timestamp) => {
    const { startDate, endDate } = getDisplayWindow(taskEmission);
    const earliest = moment(timestamp).subtract(TIMELY_WINDOW.start, 'days');
    const latest = moment(timestamp).add(TIMELY_WINDOW.end, 'days');
    return earliest.isBefore(endDate) && latest.isAfter(startDate);
  },

  setStateOnTaskDoc: (taskDoc, updatedState, timestamp = Date.now(), reason = '') => {
    if (!taskDoc) {
      return;
    }

    if (!updatedState) {
      taskDoc.state = States.Cancelled;
      taskDoc.stateReason = 'invalid';
    } else {
      taskDoc.state = updatedState;
      if (reason) {
        taskDoc.stateReason = reason;
      }
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
