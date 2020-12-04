import { expect } from 'chai';

import { Actions } from '@mm-actions/tasks';
import { Actions as GlobalActions } from '@mm-actions/global';
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
        selected: null,
        loaded: false,
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
        selected: null,
        loaded: true,
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
        selected: selected,
        loaded: false,
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
    it('should work with empty list', () => {
      state = tasksReducer(state, Actions.setTasksList([]));
      expect(state).to.deep.equal({
        tasksList: [],
        selected: null,
        loaded: false,
      });
    });

    it('should not change other properties', () => {
      state = {
        tasksList: [{ _id: 'aaa' }],
        selected: { _id: 'aaa' },
        loaded: true,
      };
      const taskList = [
        { _id: 'bbb', dueDate: '22', state: 'Ready' },
        { _id: 'ccc', dueDate: '33', state: 'Ready' },
      ];
      state = tasksReducer(state, Actions.setTasksList(taskList));
      expect(state).to.deep.equal({
        tasksList: [
          { _id: 'bbb', dueDate: '22', state: 'Ready' },
          { _id: 'ccc', dueDate: '33', state: 'Ready' },
        ],
        selected: { _id: 'aaa' },
        loaded: true,
      });
    });

    it('should set the list to empty', () => {
      state = {
        tasksList: [{ _id: 'aaa' }],
        selected: { _id: 'aaa' },
        loaded: true,
      };
      state = tasksReducer(state, Actions.setTasksList([]));
      expect(state).to.deep.equal({
        tasksList: [],
        selected: { _id: 'aaa' },
        loaded: true,
      });
    });

    it('should sort provided tasks by due date', () => {
      const tasks = [
        { _id: 'task1', dueDate: false, state: 'Ready', field: 1 },
        { _id: 'task2', dueDate: undefined, state: 'Ready', field: 2 },
        { _id: 'task3', dueDate: 0, state: 'Ready', field: 3 },
        { _id: 'task4', dueDate: 500, state: 'Ready', field: 4 },
        { _id: 'task5', dueDate: 500, state: 'Ready', field: 5 },
        { _id: 'task6', dueDate: 250, state: 'Ready', field: 6 },
        { _id: 'task7', dueDate: 125, state: 'Ready', field: 7 },
        { _id: 'task8', dueDate: 899, state: 'Ready', field: 8 },
        { _id: 'task9', dueDate: -100, state: 'Ready', field: 9 },
      ];

      state = tasksReducer(state, Actions.setTasksList(tasks));
      expect(state).to.deep.equal({
        selected: null,
        loaded: false,
        tasksList: [
          { _id: 'task9', dueDate: -100, state: 'Ready', field: 9 },
          { _id: 'task7', dueDate: 125, state: 'Ready', field: 7 },
          { _id: 'task6', dueDate: 250, state: 'Ready', field: 6 },
          { _id: 'task4', dueDate: 500, state: 'Ready', field: 4 },
          { _id: 'task5', dueDate: 500, state: 'Ready', field: 5 },
          { _id: 'task8', dueDate: 899, state: 'Ready', field: 8 },
          { _id: 'task1', dueDate: false, state: 'Ready', field: 1 },
          { _id: 'task2', dueDate: undefined, state: 'Ready', field: 2 },
          { _id: 'task3', dueDate: 0, state: 'Ready', field: 3 },
        ]
      });
    });
  });
});
