import { Store } from '@ngrx/store';
import { createSingleValueAction } from './actionUtils';

export const Actions = {
  setTasksList: createSingleValueAction('SET_TASKS_LIST', 'tasks'),
  setTasksLoaded: createSingleValueAction('SET_TASKS_LOADED', 'loaded'),
  setSelectedTask: createSingleValueAction('SET_SELECTED_TASK', 'selected'),
  setLastCompletedTask: createSingleValueAction('SET_LAST_COMPLETED_TASK', 'task'),
  setActivePlace: createSingleValueAction('SET_ACTIVE_PLACE', 'place'),
};

export class TasksActions {
  constructor(private store: Store) {}

  setTasksList(tasks) {
    return this.store.dispatch(Actions.setTasksList(tasks));
  }

  setTasksLoaded(loaded) {
    return this.store.dispatch(Actions.setTasksLoaded(loaded));
  }

  setSelectedTask(selected) {
    return this.store.dispatch(Actions.setSelectedTask(selected));
  }

  setLastCompletedTask(task) {
    return this.store.dispatch(Actions.setLastCompletedTask(task));
  }

  setActivePlace(place) {
    return this.store.dispatch(Actions.setActivePlace(place));
  }
}
