import { createReducer, on } from '@ngrx/store';
import * as moment from 'moment';

import { Actions as GlobalActions } from '@mm-actions/global';
import { Actions } from '@mm-actions/tasks';
import { TaskEmission } from '@mm-services/rules-engine.service';

/**
 * Sort tasks by due date and priority
 * Sorting rules (in order):
 * 1. Valid priorities sort first (higher value = higher priority)
 * 2. Equal priorities sort by due date (earlier = higher priority)
 * 3. Invalid/missing values sort last while maintaining original order
 */
export const orderByDueDateAndPriority = (t1, t2) => {
  const getDueDate = dueDate => {
    if (typeof dueDate !== 'number' && typeof dueDate !== 'string') {
      return Number.NaN;
    }
    const numericDate = Number(dueDate);
    if (!Number.isNaN(numericDate)) {
      return numericDate;
    }
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
    if (Number.isNaN(lhsDate) && Number.isNaN(rhsDate)) {
      return 0;
    }
    if (Number.isNaN(lhsDate)) {
      return 1;
    }
    if (Number.isNaN(rhsDate)) {
      return -1;
    }
    return lhsDate - rhsDate;
  };

  if (Number.isNaN(lhsPriority) && Number.isNaN(rhsPriority)) {
    return compareDates();
  }

  if (Number.isNaN(lhsPriority)) {
    return 1;
  }
  if (Number.isNaN(rhsPriority)) {
    return -1;
  }

  if (lhsPriority !== rhsPriority) {
    return rhsPriority - lhsPriority;
  }

  return compareDates();
};

const initialState = {
  tasksList: [] as TaskEmission[],
  overdue: [] as TaskEmission[],
  selected: null,
  loaded: false,
  taskGroup: {
    lastSubmittedTask: null,
    contact: null,
    loadingContact: null as any,
  },
};

const _tasksReducer = createReducer(
  initialState,
  on(GlobalActions.clearSelected, state => ({ ...state, selected: null })),

  on(Actions.setTasksList, (state, { payload: { tasks } }) => {
    const taskEmissions = tasks as TaskEmission[];
    const sortedTasks = [...taskEmissions].sort(orderByDueDateAndPriority);
    const overdueTasks = taskEmissions.filter(task => task.overdue);

    return {
      ...state,
      tasksList: sortedTasks,
      overdue: overdueTasks,
    };
  }),

  on(Actions.setOverdueTasks, (state, { payload: { tasks } }) => {
    const overdueTasks = [...state.overdue];
    tasks.forEach(({ emission }) => {
      const overdueTaskIndex = state.overdue.findIndex(overdue => overdue._id === emission._id);

      const isCurrentlyOverdue = overdueTaskIndex !== -1;

      if (isCurrentlyOverdue && !emission.overdue) {
        // was overdue, shouldn't be anymore → remove
        overdueTasks.splice(overdueTaskIndex, 1);
      } else if (!isCurrentlyOverdue && emission.overdue) {
        // wasn't overdue, should be now → add
        overdueTasks.push(emission);
      }
    });

    return {
      ...state,
      overdue: overdueTasks,
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
  })),

  on(Actions.clearTaskList, state => ({
    ...state,
    tasksList: [],
  }))
);

export const tasksReducer = (state, action) => {
  return _tasksReducer(state, action);
};
