import { Actions } from '../actions/tasks';
import { createReducer, on } from '@ngrx/store';
import * as _ from 'lodash-es';

const initialState = {
  tasks: [],
  tasksById: new Map(),
  selected: [],
};


const _removeTask = (tasks, tasksById, task) => {
  if (!task._id || !tasksById.has(task._id)) {
    return;
  }

  const idx = tasks.findIndex(r => r._id === task._id);
  tasks.splice(idx, 1);
  tasksById.delete(task._id);
}

const _insertTask = (tasks, tasksById, task) => {
  if (!task._id || tasksById.has(task._id)) {
    return;
  }

  const idx = _.sortedIndexBy(tasks, task, r => -r.tasked_date);
  tasks.splice(idx, 0, task);
  tasksById.add(task._id);
}

const updateTasks = (state, newTasks) => {
  const tasks = [...state.tasks];
  const tasksById = new Set(state.tasksById);

  newTasks.forEach(task => {
    _removeTask(tasks, tasksById, task);
    _insertTask(tasks, tasksById, task);
  });

  return { ...state, tasks, tasksById };
}

const removeTask = (state, task) => {
  const tasks = [ ...state.tasks];
  const tasksById = new Set(state.tasksById);

  _removeTask(tasks, tasksById, task);
  return { ...state, tasks, tasksById };
}


const _tasksReducer = createReducer(
    initialState,
    on(Actions.setTasksLoaded, (state, { payload: { tasks } }) => updateTasks(state, tasks)),
    on(Actions.removeTaskFromList, (state, { payload: { task } }) => removeTask(state, task)),
    on(Actions.resetTasksList, (state) => ({ ...state, tasks: [], tasksById: new Map })),
);

export function tasksReducer(state, action) {
  return _tasksReducer(state, action);
}

/*
module.exports = function(state, action) {
  if (typeof state === 'undefined') {
    state = initialState;
  }

  switch (action.type) {
  case actionTypes.CLEAR_SELECTED:
    return Object.assign({}, state, { selected: null });
  case actionTypes.SET_SELECTED_TASK:
    return Object.assign({}, state, { selected: action.payload.selected });
  case actionTypes.SET_TASKS_LOADED:
    return Object.assign({}, state, { loaded: action.payload.loaded });
  default:
    return state;
  }
};
*/
