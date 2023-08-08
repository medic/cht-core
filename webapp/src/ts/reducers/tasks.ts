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

  on(Actions.setLastSubmittedTask, (state, { payload: { task } }) => ({
    ...state,
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
