import { createReducer, on } from '@ngrx/store';

import { Actions } from '@mm-actions/tasks';
import { Actions as GlobalActions } from '@mm-actions/global';

const initialState = {
  tasksList: [],
  selected: null,
  loaded: false,
  taskGroup: {
    lastCompletedTask: null,
    contact: null,
    loadingContact: null,
  },
};

const orderByDueDate = (t1, t2) => {
  const lhs = t1?.dueDate;
  const rhs = t2?.dueDate;
  if (!lhs && !rhs) {
    return 0;
  }
  if (!lhs) {
    return 1;
  }
  if (!rhs) {
    return -1;
  }

  return lhs < rhs ? -1 : 1;
};

const _tasksReducer = createReducer(
  initialState,
  on(GlobalActions.clearSelected, (state) => ({ ...state, selected: null })),

  on(Actions.setTasksList, (state, { payload: { tasks } }) => {
    return {
      ...state,
      tasksList: [...tasks].sort(orderByDueDate),
    };
  }),

  on(Actions.setTasksLoaded, (state, { payload: { loaded }}) => ({ ...state, loaded })),

  on(Actions.setSelectedTask, (state, { payload: { selected } }) => ({ ...state, selected })),

  on(Actions.setLastCompletedTask, (state, { payload: { task } }) => ({
    ...state,
    taskGroup: {
      ...state.taskGroup,
      lastCompletedTask: task
    },
  })),

  on(Actions.setTaskGroupContact, (state, { payload: { contact } }) => ({
    ...state,
    taskGroup: {
      ...state.taskGroup,
      contact,
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
      lastCompletedTask: taskGroup.lastCompletedTask || state.taskGroup.lastCompletedTask,
      contact: taskGroup.contact || state.taskGroup.contact,
      loadingContact: taskGroup.loadingContact || state.taskGroup.loadingContact,
    },
  })),

  on(Actions.clearTaskGroup, (state) => ({
    ...state,
    taskGroup: { ...initialState.taskGroup },
  }))
);

export function tasksReducer(state, action) {
  return _tasksReducer(state, action);
}
