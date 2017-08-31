const assert = require('chai').assert;
const views = require('../../../../lib/views');

describe('tasks_pending view', () => {

  let emitted;
  emit = function(e) {
    emitted.push(e);
  };

  beforeEach(() => emitted = []);

  it('No emit on empty doc', () => {
    views.tasks_pending.map({});

    assert.deepEqual(emitted, []);
  });

  it('No emit for empty tasks', () => {
    views.tasks_pending.map({
      tasks: [],
      scheduled_tasks: []
    });

    assert.deepEqual(emitted, []);
  });

  it('No emit when tasks missing messages', () => {
    views.tasks_pending.map({
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

    views.tasks_pending.map({
      tasks: [{
        state: 'pending',
        messages: null
      }]
    });

    assert.deepEqual(emitted, []);
  });

  it('Emits only for pending tasks', () => {
    views.tasks_pending.map({
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
    views.tasks_pending.map({
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
    views.tasks_pending.map({
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

    views.tasks_pending.map({
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

    assert.deepEqual(emitted, [['test', 'passed']]);
  });


  it('any of the tasks can be valid for the emit to occur', () => {
    views.tasks_pending.map({
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
    views.tasks_pending.map({
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
    views.tasks_pending.map({
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
    views.tasks_pending.map({
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
