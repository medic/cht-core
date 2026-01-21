import { expect } from 'chai';
import sinon from 'sinon';
import moment from 'moment';

import { Actions as GlobalActions } from '@mm-actions/global';
import { Actions } from '@mm-actions/tasks';
import { tasksReducer } from '@mm-reducers/tasks';

describe('Tasks reducer', () => {
  let state;
  beforeEach(() => {
    state = undefined;
  });

  describe('global.clearSelected', () => {
    it('should clear selected on empty state', () => {
      state = tasksReducer(state, GlobalActions.clearSelected());
      expect(state).to.deep.equal({
        tasksList: [],
        overdue: [],
        selected: null,
        loaded: false,
        taskGroup: {
          lastSubmittedTask: null,
          contact: null,
          loadingContact: null,
        },
      });
    });

    it('should clear selected when selected is set', () => {
      state = {
        tasksList: [],
        loaded: false,
        selected: { _id: 'taskid', dueDate: '22' },
      };
      state = tasksReducer(state, GlobalActions.clearSelected());
      expect(state).to.deep.equal({
        tasksList: [],
        selected: null,
        loaded: false,
      });
    });

    it('should not change other properties', () => {
      state = {
        tasksList: [
          { _id: 'task1', dueDate: 22, state: 'Ready' },
          { _id: 'task2', dueDate: 33, state: 'Ready' },
        ],
        loaded: true,
        selected: { _id: 'task3' },
      };
      state = tasksReducer(state, GlobalActions.clearSelected());
      expect(state).to.deep.equal({
        tasksList: [
          { _id: 'task1', dueDate: 22, state: 'Ready' },
          { _id: 'task2', dueDate: 33, state: 'Ready' },
        ],
        selected: null,
        loaded: true,
      });
    });
  });

  describe('setTasksLoaded', () => {
    it('should work with empty state', () => {
      state = tasksReducer(state, Actions.setTasksLoaded(true));
      expect(state).to.deep.equal({
        tasksList: [],
        overdue: [],
        selected: null,
        loaded: true,
        taskGroup: {
          lastSubmittedTask: null,
          contact: null,
          loadingContact: null,
        },
      });
    });

    it('should work with existent state', () => {
      state = {
        selected: { _id: 'taskid', dueDate: '22' },
        tasksList: [{ _id: 'taskid' }],
        loaded: true,
      };
      state = tasksReducer(state, Actions.setTasksLoaded(false));
      expect(state).to.deep.equal({
        tasksList: [{ _id: 'taskid' }],
        selected: { _id: 'taskid', dueDate: '22' },
        loaded: false,
      });
    });

    it('should not update other properties', () => {
      state = {
        tasksList: [
          { _id: 'task1', dueDate: 22, state: 'Ready' },
          { _id: 'task2', dueDate: 33, state: 'Ready' },
        ],
        selected: { _id: 'task3' },
      };
      state = tasksReducer(state, Actions.setTasksLoaded('something'));
      expect(state).to.deep.equal({
        tasksList: [
          { _id: 'task1', dueDate: 22, state: 'Ready' },
          { _id: 'task2', dueDate: 33, state: 'Ready' },
        ],
        selected: { _id: 'task3' },
        loaded: 'something',
      });
    });
  });

  describe('setSelectedTask', () => {
    it('should work on empty state', () => {
      const selected = { _id: 'task_id', due: '22', field: 1 };
      state = tasksReducer(state, Actions.setSelectedTask(selected));
      expect(state).to.deep.equal({
        tasksList: [],
        overdue: [],
        selected: selected,
        loaded: false,
        taskGroup: {
          lastSubmittedTask: null,
          contact: null,
          loadingContact: null,
        },
      });
    });

    it('should work with existent state', () => {
      state = {
        selected: { _id: 'task_id', due: '22', field: 1 },
        tasksList: [
          { _id: 'task1', dueDate: 22, state: 'Ready' },
          { _id: 'task2', dueDate: 33, state: 'Ready' },
        ],
        loaded: true,
      };
      const selected = { _id: 'task_id2', due: '33', field: 2 };
      state = tasksReducer(state, Actions.setSelectedTask(selected));
      expect(state).to.deep.equal({
        tasksList: [
          { _id: 'task1', dueDate: 22, state: 'Ready' },
          { _id: 'task2', dueDate: 33, state: 'Ready' },
        ],
        selected: selected,
        loaded: true,
      });
    });

    it('should work with null selected', () => {
      state = {
        selected: { _id: 'task_id', due: '22', field: 1 },
        tasksList: [
          { _id: 'task1', dueDate: 22, state: 'Ready' },
          { _id: 'task2', dueDate: 33, state: 'Ready' },
        ],
        loaded: true,
      };

      state = tasksReducer(state, Actions.setSelectedTask(null));
      expect(state).to.deep.equal({
        tasksList: [
          { _id: 'task1', dueDate: 22, state: 'Ready' },
          { _id: 'task2', dueDate: 33, state: 'Ready' },
        ],
        selected: null,
        loaded: true,
      });
    });
  });

  describe('setTasksList', () => {
    let clock;
    beforeEach(() => {
      clock = sinon.useFakeTimers(moment('2025-06-01').valueOf());
    });

    afterEach(() => {
      clock.restore();
    });

    it('should work with empty list', () => {
      state = tasksReducer(state, Actions.setTasksList([]));
      expect(state).to.deep.equal({
        tasksList: [],
        overdue: [],
        selected: null,
        loaded: false,
        taskGroup: {
          lastSubmittedTask: null,
          contact: null,
          loadingContact: null,
        },
      });
    });

    it('should not change other properties', () => {
      state = {
        tasksList: [{ _id: 'aaa' }],
        selected: { _id: 'aaa' },
        loaded: true,
      };
      const taskList = [
        { _id: 'bbb', dueDate: '2025-01-01', state: 'Ready', overdue: true },
        { _id: 'ccc', dueDate: '2025-07-01', state: 'Ready', overdue: false },
      ];
      state = tasksReducer(state, Actions.setTasksList(taskList));
      expect(state.tasksList).to.deep.equal([
        { _id: 'bbb', dueDate: '2025-01-01', state: 'Ready', overdue: true },
        { _id: 'ccc', dueDate: '2025-07-01', state: 'Ready', overdue: false },
      ]);
      expect(state.selected).to.deep.equal({ _id: 'aaa' });
      expect(state.loaded).to.equal(true);
      // First task is overdue based on the overdue property
      expect(state.overdue).to.deep.equal([
        { _id: 'bbb', dueDate: '2025-01-01', state: 'Ready', overdue: true }
      ]);
    });

    it('should set the list to empty', () => {
      state = {
        tasksList: [{ _id: 'aaa' }],
        selected: { _id: 'aaa' },
        loaded: true,
      };
      state = tasksReducer(state, Actions.setTasksList([]));
      expect(state.tasksList).to.deep.equal([]);
      expect(state.selected).to.deep.equal({ _id: 'aaa' });
      expect(state.loaded).to.equal(true);
      expect(state.overdue).to.deep.equal([]);
    });

    it('should sort provided tasks by due date', () => {
      const tasks = [
        { _id: 'task1', dueDate: false, state: 'Ready', field: 1, overdue: false },
        { _id: 'task2', dueDate: undefined, state: 'Ready', field: 2, overdue: false },
        { _id: 'task3', dueDate: 0, state: 'Ready', field: 3, overdue: true },
        { _id: 'task4', dueDate: 500, state: 'Ready', field: 4, overdue: true },
        { _id: 'task5', dueDate: 500, state: 'Ready', field: 5, overdue: true },
        { _id: 'task6', dueDate: 250, state: 'Ready', field: 6, overdue: true },
        { _id: 'task7', dueDate: 125, state: 'Ready', field: 7, overdue: true },
        { _id: 'task8', dueDate: 899, state: 'Ready', field: 8, overdue: true },
        { _id: 'task9', dueDate: -100, state: 'Ready', field: 9, overdue: true },
      ];

      state = tasksReducer(state, Actions.setTasksList(tasks));
      expect(state.selected).to.equal(null);
      expect(state.loaded).to.equal(false);
      expect(state.taskGroup).to.deep.equal({
        lastSubmittedTask: null,
        contact: null,
        loadingContact: null,
      });
      expect(state.tasksList).to.deep.equal([
        { _id: 'task9', dueDate: -100, state: 'Ready', field: 9, overdue: true },
        { _id: 'task3', dueDate: 0, state: 'Ready', field: 3, overdue: true },
        { _id: 'task7', dueDate: 125, state: 'Ready', field: 7, overdue: true },
        { _id: 'task6', dueDate: 250, state: 'Ready', field: 6, overdue: true },
        { _id: 'task4', dueDate: 500, state: 'Ready', field: 4, overdue: true },
        { _id: 'task5', dueDate: 500, state: 'Ready', field: 5, overdue: true },
        { _id: 'task8', dueDate: 899, state: 'Ready', field: 8, overdue: true },
        { _id: 'task1', dueDate: false, state: 'Ready', field: 1, overdue: false },
        { _id: 'task2', dueDate: undefined, state: 'Ready', field: 2, overdue: false },
      ]);
      // Tasks with overdue: true are in the overdue array
      expect(state.overdue).to.have.deep.members([
        { _id: 'task9', dueDate: -100, state: 'Ready', field: 9, overdue: true },
        { _id: 'task3', dueDate: 0, state: 'Ready', field: 3, overdue: true },
        { _id: 'task7', dueDate: 125, state: 'Ready', field: 7, overdue: true },
        { _id: 'task6', dueDate: 250, state: 'Ready', field: 6, overdue: true },
        { _id: 'task4', dueDate: 500, state: 'Ready', field: 4, overdue: true },
        { _id: 'task5', dueDate: 500, state: 'Ready', field: 5, overdue: true },
        { _id: 'task8', dueDate: 899, state: 'Ready', field: 8, overdue: true },
      ]);
    });

    it('should sort provided tasks by priority and due date', () => {
      const tasks = [
        {
          _id: 'task1',
          dueDate: '2025-05-30',
          priority: 'invalid',
          state: 'Ready',
          field: 1,
          overdue: true,
        },
        {
          _id: 'task2',
          dueDate: '2025-05-30',
          priority: 3,
          state: 'Ready',
          field: 2,
          overdue: true,
        },
        {
          _id: 'task3',
          dueDate: '2025-05-27',
          priority: 1,
          state: 'Ready',
          field: 3,
          overdue: true,
        },
        {
          _id: 'task4',
          dueDate: '2025-05-27',
          priority: 2,
          state: 'Ready',
          field: 4,
          overdue: true,
        },
        {
          _id: 'task5',
          dueDate: '2025-05-31',
          priority: undefined,
          state: 'Ready',
          field: 5,
          overdue: true,
        },
        {
          _id: 'task6',
          dueDate: '2025-05-31',
          priority: 'high',
          state: 'Ready',
          field: 6,
          overdue: true,
        },
        {
          _id: 'task7',
          dueDate: '2025-05-07',
          priority: 1,
          state: 'Ready',
          field: 7,
          overdue: true,
        },
        {
          _id: 'task8',
          dueDate: '2025-05-07',
          priority: 2,
          state: 'Ready',
          field: 8,
          overdue: true,
        },
        {
          _id: 'task9',
          dueDate: null,
          priority: 3,
          state: 'Ready',
          field: 9,
          overdue: false,
        },
        {
          _id: 'task10',
          dueDate: false,
          priority: 2,
          state: 'Ready',
          field: 10,
          overdue: false,
        },
        {
          _id: 'task14',
          dueDate: '2025-05-17',
          priority: 2,
          state: 'Ready',
          field: 14,
          overdue: true,
        },
        {
          _id: 'task11',
          dueDate: undefined,
          priority: undefined,
          state: 'Ready',
          field: 11,
          overdue: false,
        },
        {
          _id: 'task12',
          dueDate: '2025-05-17',
          priority: 5,
          state: 'Ready',
          field: 12,
          overdue: true,
        },
        {
          _id: 'task13',
          dueDate: '2025-05-17',
          priority: -1,
          state: 'Ready',
          field: 13,
          overdue: true,
        },
      ];

      state = tasksReducer(state, Actions.setTasksList(tasks));
      expect(state.selected).to.equal(null);
      expect(state.loaded).to.equal(false);
      expect(state.taskGroup).to.deep.equal({
        lastSubmittedTask: null,
        contact: null,
        loadingContact: null,
      });
      expect(state.tasksList).to.deep.equal([
        {
          _id: 'task12',
          dueDate: '2025-05-17',
          priority: 5,
          state: 'Ready',
          field: 12,
          overdue: true,
        },
        {
          _id: 'task2',
          dueDate: '2025-05-30',
          priority: 3,
          state: 'Ready',
          field: 2,
          overdue: true,
        },
        {
          _id: 'task9',
          dueDate: null,
          priority: 3,
          state: 'Ready',
          field: 9,
          overdue: false,
        },
        {
          _id: 'task8',
          dueDate: '2025-05-07',
          priority: 2,
          state: 'Ready',
          field: 8,
          overdue: true,
        },
        {
          _id: 'task14',
          dueDate: '2025-05-17',
          priority: 2,
          state: 'Ready',
          field: 14,
          overdue: true,
        },
        {
          _id: 'task4',
          dueDate: '2025-05-27',
          priority: 2,
          state: 'Ready',
          field: 4,
          overdue: true,
        },
        {
          _id: 'task10',
          dueDate: false,
          priority: 2,
          state: 'Ready',
          field: 10,
          overdue: false,
        },
        {
          _id: 'task7',
          dueDate: '2025-05-07',
          priority: 1,
          state: 'Ready',
          field: 7,
          overdue: true,
        },
        {
          _id: 'task3',
          dueDate: '2025-05-27',
          priority: 1,
          state: 'Ready',
          field: 3,
          overdue: true,
        },
        {
          _id: 'task13',
          dueDate: '2025-05-17',
          priority: -1,
          state: 'Ready',
          field: 13,
          overdue: true,
        },
        {
          _id: 'task1',
          dueDate: '2025-05-30',
          priority: 'invalid',
          state: 'Ready',
          field: 1,
          overdue: true,
        },
        {
          _id: 'task5',
          dueDate: '2025-05-31',
          priority: undefined,
          state: 'Ready',
          field: 5,
          overdue: true,
        },
        {
          _id: 'task6',
          dueDate: '2025-05-31',
          priority: 'high',
          state: 'Ready',
          field: 6,
          overdue: true,
        },
        {
          _id: 'task11',
          dueDate: undefined,
          priority: undefined,
          state: 'Ready',
          field: 11,
          overdue: false,
        },
      ]);
      // Tasks with overdue: true are in the overdue array
      expect(state.overdue).to.have.deep.members([
        {
          _id: 'task12',
          dueDate: '2025-05-17',
          priority: 5,
          state: 'Ready',
          field: 12,
          overdue: true,
        },
        {
          _id: 'task2',
          dueDate: '2025-05-30',
          priority: 3,
          state: 'Ready',
          field: 2,
          overdue: true,
        },
        {
          _id: 'task8',
          dueDate: '2025-05-07',
          priority: 2,
          state: 'Ready',
          field: 8,
          overdue: true,
        },
        {
          _id: 'task14',
          dueDate: '2025-05-17',
          priority: 2,
          state: 'Ready',
          field: 14,
          overdue: true,
        },
        {
          _id: 'task4',
          dueDate: '2025-05-27',
          priority: 2,
          state: 'Ready',
          field: 4,
          overdue: true,
        },
        {
          _id: 'task7',
          dueDate: '2025-05-07',
          priority: 1,
          state: 'Ready',
          field: 7,
          overdue: true,
        },
        {
          _id: 'task3',
          dueDate: '2025-05-27',
          priority: 1,
          state: 'Ready',
          field: 3,
          overdue: true,
        },
        {
          _id: 'task13',
          dueDate: '2025-05-17',
          priority: -1,
          state: 'Ready',
          field: 13,
          overdue: true,
        },
        {
          _id: 'task1',
          dueDate: '2025-05-30',
          priority: 'invalid',
          state: 'Ready',
          field: 1,
          overdue: true,
        },
        {
          _id: 'task5',
          dueDate: '2025-05-31',
          priority: undefined,
          state: 'Ready',
          field: 5,
          overdue: true,
        },
        {
          _id: 'task6',
          dueDate: '2025-05-31',
          priority: 'high',
          state: 'Ready',
          field: 6,
          overdue: true,
        },
      ]);
    });
  });

  describe('setLastSubmittedTask', () => {
    it('should work on empty state', () => {
      const task = { _id: 'task_id', due: '22', field: 1 };
      state = tasksReducer(state, Actions.setLastSubmittedTask(task));
      expect(state).to.deep.equal({
        tasksList: [],
        overdue: [],
        selected: null,
        loaded: false,
        taskGroup: {
          contact: null,
          loadingContact: null,
          lastSubmittedTask: task,
        },
      });
    });

    it('should work with existent state', () => {
      state = {
        selected: { _id: 'task_id', due: '22', field: 1 },
        tasksList: [
          { _id: 'task1', dueDate: 22, state: 'Ready' },
          { _id: 'task2', dueDate: 33, state: 'Ready' },
          { _id: 'task_id2', due: '33', field: 2 },
        ],
        loaded: true,
        taskGroup: {
          contact: { _id: 'contact' },
          loadingContact: false,
          lastSubmittedTask: { _id: 'othertask' },
        },
      };
      const task = { _id: 'task_id2', due: '33', field: 2 };
      state = tasksReducer(state, Actions.setLastSubmittedTask(task));
      expect(state).to.deep.equal({
        tasksList: [
          { _id: 'task1', dueDate: 22, state: 'Ready' },
          { _id: 'task2', dueDate: 33, state: 'Ready' },
        ],
        selected: { _id: 'task_id', due: '22', field: 1 },
        loaded: true,
        taskGroup: {
          contact: { _id: 'contact' },
          loadingContact: false,
          lastSubmittedTask: task,
        },
      });
    });

    it('should work with null task', () => {
      state = {
        selected: { _id: 'task_id', due: '22', field: 1 },
        tasksList: [
          { _id: 'task1', dueDate: 22, state: 'Ready' },
          { _id: 'task2', dueDate: 33, state: 'Ready' },
        ],
        loaded: true,
        taskGroup: {
          contact: null,
          loadingContact: true,
          lastSubmittedTask: { _id: 'othertask' },
        },
      };

      state = tasksReducer(state, Actions.setLastSubmittedTask(null));
      expect(state).to.deep.equal({
        selected: { _id: 'task_id', due: '22', field: 1 },
        tasksList: [
          { _id: 'task1', dueDate: 22, state: 'Ready' },
          { _id: 'task2', dueDate: 33, state: 'Ready' },
        ],
        loaded: true,
        taskGroup: {
          contact: null,
          loadingContact: true,
          lastSubmittedTask: null,
        },
      });
    });
  });

  describe('setTaskGroupContact', () => {
    it('should work on empty state', () => {
      const contact = { _id: 'contact', type: 'person' };
      state = tasksReducer(state, Actions.setTaskGroupContact(contact));
      expect(state).to.deep.equal({
        tasksList: [],
        overdue: [],
        selected: null,
        loaded: false,
        taskGroup: {
          contact: contact,
          loadingContact: false,
          lastSubmittedTask: null,
        },
      });
    });

    it('should work with existent state', () => {
      state = {
        selected: { _id: 'task_id', due: '22', field: 1 },
        tasksList: [
          { _id: 'task1', dueDate: 22, state: 'Ready' },
          { _id: 'task2', dueDate: 33, state: 'Ready' },
        ],
        loaded: true,
        taskGroup: {
          contact: null,
          loadingContact: true,
          lastSubmittedTask: { _id: 'othertask' },
        },
      };
      const contact = { _id: 'contact2', type: 'clinic' };
      state = tasksReducer(state, Actions.setTaskGroupContact(contact));
      expect(state).to.deep.equal({
        tasksList: [
          { _id: 'task1', dueDate: 22, state: 'Ready' },
          { _id: 'task2', dueDate: 33, state: 'Ready' },
        ],
        selected: { _id: 'task_id', due: '22', field: 1 },
        loaded: true,
        taskGroup: {
          contact: { _id: 'contact2', type: 'clinic' },
          loadingContact: false,
          lastSubmittedTask: { _id: 'othertask' },
        },
      });
    });

    it('should work with null contact', () => {
      state = {
        selected: { _id: 'task_id', due: '22', field: 1 },
        tasksList: [
          { _id: 'task1', dueDate: 22, state: 'Ready' },
          { _id: 'task2', dueDate: 33, state: 'Ready' },
        ],
        loaded: true,
        taskGroup: {
          contact: { _id: 'somecontact' },
          loadingContact: true,
          lastSubmittedTask: { _id: 'othertask' },
        },
      };

      state = tasksReducer(state, Actions.setTaskGroupContact(null));
      expect(state).to.deep.equal({
        selected: { _id: 'task_id', due: '22', field: 1 },
        tasksList: [
          { _id: 'task1', dueDate: 22, state: 'Ready' },
          { _id: 'task2', dueDate: 33, state: 'Ready' },
        ],
        loaded: true,
        taskGroup: {
          contact: null,
          loadingContact: false,
          lastSubmittedTask: { _id: 'othertask' },
        },
      });
    });
  });

  describe('setTaskGroupContactLoading', () => {
    it('should work on empty state', () => {
      state = tasksReducer(state, Actions.setTaskGroupContactLoading(true));
      expect(state).to.deep.equal({
        tasksList: [],
        overdue: [],
        selected: null,
        loaded: false,
        taskGroup: {
          contact: null,
          loadingContact: true,
          lastSubmittedTask: null,
        },
      });
    });

    it('should work with existent state', () => {
      state = {
        selected: { _id: 'task_id', due: '22', field: 1 },
        tasksList: [
          { _id: 'task1', dueDate: 22, state: 'Ready' },
          { _id: 'task2', dueDate: 33, state: 'Ready' },
        ],
        loaded: true,
        taskGroup: {
          contact: { _id: 'contact2', type: 'clinic' },
          loadingContact: true,
          lastSubmittedTask: { _id: 'othertask' },
        },
      };
      state = tasksReducer(state, Actions.setTaskGroupContactLoading(false));
      expect(state).to.deep.equal({
        tasksList: [
          { _id: 'task1', dueDate: 22, state: 'Ready' },
          { _id: 'task2', dueDate: 33, state: 'Ready' },
        ],
        selected: { _id: 'task_id', due: '22', field: 1 },
        loaded: true,
        taskGroup: {
          contact: { _id: 'contact2', type: 'clinic' },
          loadingContact: false,
          lastSubmittedTask: { _id: 'othertask' },
        },
      });
    });
  });

  describe('clearTaskGroup', () => {
    it('should work on empty state', () => {
      state = tasksReducer(state, Actions.clearTaskGroup());
      expect(state).to.deep.equal({
        tasksList: [],
        overdue: [],
        selected: null,
        loaded: false,
        taskGroup: {
          contact: null,
          loadingContact: null,
          lastSubmittedTask: null,
        },
      });
    });

    it('should work with existent state', () => {
      state = {
        selected: { _id: 'task_id', due: '22', field: 1 },
        tasksList: [
          { _id: 'task1', dueDate: 22, state: 'Ready' },
          { _id: 'task2', dueDate: 33, state: 'Ready' },
        ],
        loaded: true,
        taskGroup: {
          contact: { _id: 'contact2', type: 'clinic' },
          loadingContact: true,
          lastSubmittedTask: { _id: 'othertask' },
        },
      };
      state = tasksReducer(state, Actions.clearTaskGroup());
      expect(state).to.deep.equal({
        tasksList: [
          { _id: 'task1', dueDate: 22, state: 'Ready' },
          { _id: 'task2', dueDate: 33, state: 'Ready' },
        ],
        selected: { _id: 'task_id', due: '22', field: 1 },
        loaded: true,
        taskGroup: {
          contact: null,
          loadingContact: null,
          lastSubmittedTask: null,
        },
      });
    });
  });

  describe('setOverdueTasks', () => {
    it('should add overdue task to empty state', () => {
      const task = {
        emission: { _id: 'task1', dueDate: '2025-05-01', state: 'Ready', overdue: true }
      };
      state = tasksReducer(state, Actions.setOverdueTasks([task]));
      expect(state.overdue).to.deep.equal([task.emission]);
    });

    it('should add new overdue task to existing overdue tasks', () => {
      state = {
        tasksList: [],
        selected: null,
        loaded: false,
        overdue: [
          { _id: 'task1', dueDate: '2025-05-01', state: 'Ready', overdue: true }
        ],
        taskGroup: {
          contact: null,
          loadingContact: null,
          lastSubmittedTask: null,
        },
      };

      const newTask = {
        emission: { _id: 'task2', dueDate: '2025-05-15', state: 'Ready', overdue: true }
      };
      state = tasksReducer(state, Actions.setOverdueTasks([newTask]));
      expect(state.overdue.length).to.equal(2);
      expect(state.overdue).to.deep.include(newTask.emission);
    });

    it('should remove task that is no longer overdue', () => {
      state = {
        tasksList: [],
        selected: null,
        loaded: false,
        overdue: [
          { _id: 'task1', dueDate: '2025-05-01', state: 'Ready', overdue: true }
        ],
        taskGroup: {
          contact: null,
          loadingContact: null,
          lastSubmittedTask: null,
        },
      };

      // Update task1 to no longer be overdue
      const updatedTask = {
        emission: { _id: 'task1', dueDate: '2025-12-01', state: 'Ready', overdue: false }
      };
      state = tasksReducer(state, Actions.setOverdueTasks([updatedTask]));
      expect(state.overdue.length).to.equal(0);
    });

    it('should handle multiple tasks being updated at once', () => {
      state = {
        tasksList: [],
        selected: null,
        loaded: false,
        overdue: [
          { _id: 'task1', dueDate: '2025-05-01', state: 'Ready', overdue: true }
        ],
        taskGroup: {
          contact: null,
          loadingContact: null,
          lastSubmittedTask: null,
        },
      };

      const tasks = [
        {
          emission: { _id: 'task1', dueDate: '2025-12-01', state: 'Ready', overdue: false } // no longer overdue
        },
        {
          emission: { _id: 'task2', dueDate: '2025-05-15', state: 'Ready', overdue: true } // new overdue
        },
        {
          emission: { _id: 'task3', dueDate: '2025-05-20', state: 'Ready', overdue: true } // new overdue
        }
      ];
      state = tasksReducer(state, Actions.setOverdueTasks(tasks));
      expect(state.overdue).to.have.deep.members([tasks[1].emission, tasks[2].emission]);
    });
  });
});
