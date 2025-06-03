import { createReducer, on } from '@ngrx/store';

import { Actions as GlobalActions } from '@mm-actions/global';
import { Actions } from '@mm-actions/tasks';
import moment from 'moment';

const initialState = {
  tasksList: [] as any[],
  selected: null,
  loaded: false,
  taskGroup: {
    lastSubmittedTask: null,
    contact: null,
    loadingContact: null as any,
  },
};

/**
 * Sorting rules (in order):
 * 1. Valid priorities sort first (higher value = higher priority)
 * 2. Equal priorities sort by due date (earlier = higher priority)
 * 3. Invalid/missing values sort last while maintaining original order
 */

const orderByDueDateAndPriority = (t1, t2) => {
  const getDueDate = dueDate => {
    if (typeof dueDate === 'number') {
      return dueDate;
    }
    // Handle string values
    if (typeof dueDate === 'string') {
      // Try parsing as number first
      const numericDate = Number(dueDate);
      if (!isNaN(numericDate)) {
        return numericDate;
      }

      // If not a number, try parsing as date
      if (moment(dueDate).isValid()) {
        return moment(dueDate).valueOf();
      }
    }
    return NaN;
  };

  const getPriorityValue = priority => {
    if (typeof priority === 'number' && priority >= 0) {
      return priority;
    }
    return NaN;
  };

  const lhsDate = getDueDate(t1?.dueDate);
  const rhsDate = getDueDate(t2?.dueDate);
  const lhsPriority = getPriorityValue(t1?.priority);
  const rhsPriority = getPriorityValue(t2?.priority);

  const compareDates = () => {
    // Both dates invalid, maintain original order
    if (isNaN(lhsDate) && isNaN(rhsDate)) {
      return 0;
    }
    // Move tasks without dates to end
    if (isNaN(lhsDate)) {
      return 1;
    }
    if (isNaN(rhsDate)) {
      return -1;
    }
    // Sort by date ascending
    return lhsDate - rhsDate;
  };

  // Priority comparison cascade
  if (isNaN(lhsPriority) && isNaN(rhsPriority)) {
    return compareDates(); // Both priorities invalid, sort by date
  }

  // Move tasks without valid priorities to end
  if (isNaN(lhsPriority)) {
    return 1;
  }
  if (isNaN(rhsPriority)) {
    return -1;
  }

  // Both priorities are valid, sort in descending order
  if (lhsPriority !== rhsPriority) {
    return rhsPriority - lhsPriority;
  }

  // Same priority, sort by date
  return compareDates();
};

const _tasksReducer = createReducer(
  initialState,
  on(GlobalActions.clearSelected, state => ({ ...state, selected: null })),

  on(Actions.setTasksList, (state, { payload: { tasks } }) => {
    return {
      ...state,
      tasksList: [...tasks].sort(orderByDueDateAndPriority),
    };
  }),

  on(Actions.setTasksLoaded, (state, { payload: { loaded } }) => ({
    ...state,
    loaded,
  })),

  on(Actions.setSelectedTask, (state, { payload: { selected } }) => ({
    ...state,
    selected,
  })),

  on(Actions.setLastSubmittedTask, (state, { payload: { task } }) => ({
    ...state,
    tasksList: state.tasksList.filter(t => task?._id !== t._id),
    taskGroup: {
      ...state.taskGroup,
      lastSubmittedTask: task,
    },
  })),

  on(Actions.setTaskGroupContact, (state, { payload: { contact } }) => ({
    ...state,
    taskGroup: {
      ...state.taskGroup,
      contact,
      loadingContact: false,
    },
  })),

  on(Actions.setTaskGroupContactLoading, (state, { payload: { loading } }) => ({
    ...state,
    taskGroup: {
      ...state.taskGroup,
      loadingContact: loading,
    },
  })),

  on(Actions.setTaskGroup, (state, { payload: { taskGroup } }) => ({
    ...state,
    taskGroup: {
      lastSubmittedTask:
        taskGroup.lastSubmittedTask || state.taskGroup.lastSubmittedTask,
      contact: taskGroup.contact || state.taskGroup.contact,
      loadingContact:
        taskGroup.loadingContact || state.taskGroup.loadingContact,
    },
  })),

  on(Actions.clearTaskGroup, state => ({
    ...state,
    taskGroup: { ...initialState.taskGroup },
  }))
);

export const tasksReducer = (state, action) => {
  return _tasksReducer(state, action);
};
