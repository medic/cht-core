import { createReducer, on } from '@ngrx/store';

import { Actions } from '../actions/tasks';
import { Actions as GlobalActions } from '../actions/global';

const initialState = {
  tasksList: [],
  selected: null
};

const orderBy = (t1, t2) => {
  const lhs = t1 && t1.dueDate;
  const rhs = t2 && t2.dueDate;
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
      tasksList: tasks.sort(orderBy),
    };
  }),

  on(Actions.setSelectedTask, (state, { payload: { selected } }) => {
    return {
      ...state,
      selected,
      tasksList: state.tasksList.map(task => ({ ...task, selected: task.id === selected.id })),
    };
  }),
);

export function tasksReducer(state, action) {
  return _tasksReducer(state, action);
}
