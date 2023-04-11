import { Store, createAction } from '@ngrx/store';
import { createSingleValueAction } from '@mm-actions/actionUtils';

export const Actions = {
  setTasksList: createSingleValueAction('SET_TASKS_LIST', 'tasks'),
  setTasksLoaded: createSingleValueAction('SET_TASKS_LOADED', 'loaded'),
  setSelectedTask: createSingleValueAction('SET_SELECTED_TASK', 'selected'),
  setLastSubmittedTask: createSingleValueAction('SET_LAST_SUBMITTED_TASK', 'task'),
  setTaskGroupContact: createSingleValueAction('SET_TASK_GROUP_CONTACT', 'contact'),
  setTaskGroupContactLoading: createSingleValueAction('SET_TASK_GROUP_CONTACT_LOADING', 'loading'),
  setTaskGroup: createSingleValueAction('SET_TASK_GROUP', 'taskGroup'),
  clearTaskGroup: createAction('CLEAR_TASK_GROUP'),
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

  setLastSubmittedTask(task) {
    return this.store.dispatch(Actions.setLastSubmittedTask(task));
  }

  setTaskGroupContact(contact) {
    return this.store.dispatch(Actions.setTaskGroupContact(contact));
  }

  setTaskGroupContactLoading(loading) {
    return this.store.dispatch(Actions.setTaskGroupContactLoading(loading));
  }

  setTaskGroup(taskGroup) {
    return this.store.dispatch(Actions.setTaskGroup(taskGroup));
  }

  clearTaskGroup() {
    return this.store.dispatch(Actions.clearTaskGroup());
  }
}
