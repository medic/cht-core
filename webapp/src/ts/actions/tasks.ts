import {createAction, Store} from '@ngrx/store';
import { createSingleValueAction } from './actionUtils';

export const Actions = {
  setSelectedTask: createSingleValueAction('SET_SELECTED_TASK', 'selected'),
  setTasksLoaded: createSingleValueAction('SET_TASKS_LOADED', 'loaded'),

  addSelectedTask: createSingleValueAction('ADD_SELECTED_REPORT', 'selected'),
  removeSelectedTask: createSingleValueAction('REMOVE_SELECTED_TASK', 'id'),

  updateTasksList: createSingleValueAction('UPDATE_TASKS_LIST', 'tasks'),
  removeTaskFromList: createSingleValueAction('REMOVE_TASK_FROM_LIST', 'task'),
  resetTasksList: createAction('RESET_TASKS_LIST'),
};

export class TasksActions {
  constructor(private store: Store) {}

  setSelectedTask(selected) {
    return this.store.dispatch(Actions.setSelectedTask(selected));
  }

  setTasksLoaded(promise) {
    return this.store.dispatch(Actions.setTasksLoaded(promise));
  }


  addSelectedReport(selected) {
    return this.store.dispatch(Actions.addSelectedTask(selected));
  }

  removeSelectedReport(id) {
    /*
     dispatch(ActionUtils.createSingleValueAction(actionTypes.REMOVE_SELECTED_REPORT, 'id', id));
     setRightActionBar();
     globalActions.settingSelected(true);
     $(`#reports-list li[data-record-id="${id}"] input[type="checkbox"]`).prop('checked', false);
     */
  }

  updateTasksList(tasks) {
    return this.store.dispatch(Actions.updateTasksList(tasks));
  }

  removeTaskFromList(task) {
    return this.store.dispatch(Actions.removeTaskFromList(task));
  }

  resetTasksList() {
    return this.store.dispatch(Actions.resetTasksList());
  }
}

/*
const actionTypes = require('./actionTypes');

angular.module('inboxServices').factory('TasksActions',
  function(
    ActionUtils
  ) {
    'use strict';
    'ngInject';

    return function(dispatch) {

      function setSelectedTask(selected) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_SELECTED_TASK, 'selected', selected));
      }

      function setTasksLoaded(promise) {
        dispatch(ActionUtils.createSingleValueAction(actionTypes.SET_TASKS_LOADED, 'loaded', promise));
      }

      return {
        setSelectedTask,
        setTasksLoaded,
      };
    };
  }
);
*/
