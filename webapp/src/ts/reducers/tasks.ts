import { createReducer, on } from '@ngrx/store';

import { Actions } from '@mm-actions/tasks';
import { Actions as GlobalActions } from '@mm-actions/global';

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
 * Task prioritization algorithm that combines:
 * 1. Overdue status (most urgent)
 * 2. Due today status (high urgency)
 * 3. Priority (importance)
 * 4. Due date (soonest first)
 * 5. Tasks without due dates (lowest priority)
 * 
 * Sorting rules (in order):
 * 1. Overdue tasks appear first (most urgent), sorted by priority (higher first)
 * 2. Tasks due today appear next, sorted by priority (higher first)
 * 3. Then sort other dates too by date and priority (high to low)
 * 4. For equal priority, sort by due date (earlier first)
 * 5. Tasks without due dates appear last
 */
const orderByDueDateAndPriority = (t1, t2) => {
  const getPriorityScore = (t) => {
    if (t?.priority === 'high') {
      return 10;
    } else if (t?.priority === 'medium') {
      return 6;
    } else if (typeof t?.priority === 'string') {
      return 0;
    } else {
      return t?.priority ?? 0;
    }
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  const getDateScore = (t) => {
    if (!t?.dueDate) return Infinity;
    const date = new Date(t.dueDate).getTime();
    return Math.floor((date - startOfToday) / (1000 * 60 * 60 * 24));
  };

  const p1 = getPriorityScore(t1);
  const p2 = getPriorityScore(t2);
  const days1 = getDateScore(t1);
  const days2 = getDateScore(t2);

  // Compare by due date (earlier first)
  if (days1 !== days2) {
    return days1 - days2;
  }

  // Compare by priority (higher first)
  if (p1 !== p2) {
    return p2 - p1;
  }

  // Otherwise maintain original order
  return 0;
};

const _tasksReducer = createReducer(
  initialState,
  on(GlobalActions.clearSelected, (state) => ({ ...state, selected: null })),

  on(Actions.setTasksList, (state, { payload: { tasks } }) => {
    return {
      ...state,
      tasksList: [...tasks].sort(orderByDueDateAndPriority),
    };
  }),

  on(Actions.setTasksLoaded, (state, { payload: { loaded }}) => ({ ...state, loaded })),

  on(Actions.setSelectedTask, (state, { payload: { selected } }) => ({ ...state, selected })),

  on(Actions.setLastSubmittedTask, (state, { payload: { task } }) => ({
    ...state,
    tasksList: state.tasksList.filter(t => task?._id !== t._id),
    taskGroup: {
      ...state.taskGroup,
      lastSubmittedTask: task
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
      lastSubmittedTask: taskGroup.lastSubmittedTask || state.taskGroup.lastSubmittedTask,
      contact: taskGroup.contact || state.taskGroup.contact,
      loadingContact: taskGroup.loadingContact || state.taskGroup.loadingContact,
    },
  })),

  on(Actions.clearTaskGroup, (state) => ({
    ...state,
    taskGroup: { ...initialState.taskGroup },
  }))
);

export const tasksReducer = (state, action) => {
  return _tasksReducer(state, action);
};
