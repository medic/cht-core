import { Store } from '@ngrx/store';
import { createSingleValueAction } from './actionUtils';


export const Actions = {
  setTasksList: createSingleValueAction('SET_TASKS_LIST', 'tasks'),
  setSelectedTask: createSingleValueAction('SET_SELECTED_TASK', 'selected'),
};

export class TasksActions {
  constructor(private store: Store) {}

  setTasksList(tasks) {
    return this.store.dispatch(Actions.setTasksList(tasks));
  }

  setSelectedTask(selected) {
    return this.store.dispatch(Actions.setSelectedTask(selected));
  }
}
