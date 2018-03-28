const assert = require('chai').assert,
      utils = require('./utils');

let view;

describe('tasks_pending view', () => {

  beforeEach(() => {
    view = utils.loadView('medic', 'tasks_pending');
  });

  it('No emit on empty doc', () => {
    const emitted = view({});
    assert.deepEqual(emitted, []);
  });

  it('No emit for empty tasks', () => {
    const emitted = view({
      tasks: [],
      scheduled_tasks: []
    });
    assert.deepEqual(emitted, []);
  });

  it('No emit when tasks missing messages', () => {
    const emitted = view({
      tasks: [{
        state: 'pending',
        messages: []
      }],
      scheduled_tasks: [{
        state: 'pending',
        messages: []
      }]
    });
    assert.deepEqual(emitted, []);

    const emitted2 = view({
      tasks: [{
        state: 'pending',
        messages: null
      }]
    });
    assert.deepEqual(emitted2, []);
  });

  it('Emits only for pending tasks', () => {
    const emitted = view({
      tasks: [{
        state: 'notpending',
        messages: [
          {
            to: 'someone',
            message: 'hello!'
          }
        ]
      }],
      scheduled_tasks: [{
        state: 'notpending',
        messages: [
          {
            to: 'someone',
            message: 'hello!'
          }
        ]
      }]
    });
    assert.deepEqual(emitted, []);
  });

  it('Emits when message is valid on pending task', () => {
    const emitted = view({
      tasks: [{
        state: 'pending',
        messages: [
          {
            to: 'someone',
            message: 'hello!'
          }
        ]
      }],
      reported_date: 'test',
      refid: 'passed'
    });
    assert.deepEqual(emitted, [['test', 'passed']]);
  });

  it('Emits only when message is valid on pending scheduled task with no errors', () => {
    const emitted = view({
      scheduled_tasks: [{
        state: 'pending',
        messages: [
          {
            to: 'someone',
            message: 'hello!'
          }
        ]
      }],
      errors: ['an error occurred'],
      reported_date: 'test',
      refid: 'passed'
    });

    assert.deepEqual(emitted, []);

    const emitted2 = view({
      scheduled_tasks: [{
        state: 'pending',
        messages: [
          {
            to: 'someone',
            message: 'hello!'
          }
        ]
      }],
      reported_date: 'test',
      refid: 'passed'
    });

    assert.deepEqual(emitted2, [['test', 'passed']]);
  });


  it('any of the tasks can be valid for the emit to occur', () => {
    const emitted = view({
      tasks: [{},{},{},
      {
        state: 'pending',
        messages: [
          {
            to: 'someone',
            message: 'hello!'
          }
        ]
      },{},{},{}],
      reported_date: 'test',
      refid: 'passed'
    });

    assert.deepEqual(emitted, [['test', 'passed']]);
  });

  it('any of the scheduled_tasks can be valid for the emit to occur', () => {
    const emitted = view({
      scheduled_tasks: [{},{},{},
      {
        state: 'pending',
        messages: [
          {
            to: 'someone',
            message: 'hello!'
          }
        ]
      },{},{},{}],
      reported_date: 'test',
      refid: 'passed'
    });

    assert.deepEqual(emitted, [['test', 'passed']]);
  });

  it('any of the tasks messages can be valid for the emit to occur', () => {
    const emitted = view({
      tasks: [{},{},{},
      {
        state: 'pending',
        messages: [{},{},{},
          {
            to: 'someone',
            message: 'hello!'
          },{},{},{}
        ]
      },{},{},{}],
      reported_date: 'test',
      refid: 'passed'
    });

    assert.deepEqual(emitted, [['test', 'passed']]);
  });

  it('any of the scheduled_tasks messages can be valid for the emit to occur', () => {
    const emitted = view({
      scheduled_tasks: [{},{},{},
      {
        state: 'pending',
        messages: [{},{},{},
          {
            to: 'someone',
            message: 'hello!'
          },{},{},{}
        ]
      },{},{},{}],
      reported_date: 'test',
      refid: 'passed'
    });

    assert.deepEqual(emitted, [['test', 'passed']]);
  });

});
