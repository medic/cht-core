const utils = require('../../../utils'),
      sentinelUtils = require('../utils'),
      uuid = require('uuid');

describe('resolve_pending', () => {
  afterAll(done => utils.revertDb().then(done));
  afterEach(done => utils.revertDb([], true).then(done));

  it('should be skipped when transition is disabled', () => {
    const settings = { transitions: { resolve_pending: false } };

    const doc = {
      _id: uuid(),
      reported_date: new Date().getTime(),
      tasks: [{
        state: 'pending'
      }]
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions).length).toEqual(0);
      });
  });

  it('should be skipped when no pending tasks', () => {
    const settings = { transitions: { resolve_pending: false } };

    const doc = {
      _id: uuid(),
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions).length).toEqual(0);
      });
  });

  it('should add task when matched', () => {
    const settings = { transitions: { resolve_pending: true } };

    const doc = {
      _id: uuid(),
      reported_date: new Date().getTime(),
      tasks: [
        {
          name: 'task1',
          state: 'pending',
          timestamp: new Date().getTime(),
          state_history: [{
            state: 'pending',
            timestamp: new Date().getTime()
          }],
          messages: [{ to: 'a', message: 'b' }]
        },
        {
          name: 'task2',
          state: 'pending',
          timestamp: new Date().getTime(),
          state_history: [{
            state: 'pending',
            timestamp: new Date().getTime()
          }],
          messages: [{ to: 'a', message: 'b' }]
        }
      ],
      scheduled_tasks: [
        {
          name: 'task3',
          state: 'pending',
          timestamp: new Date().getTime(),
          state_history: [{
            state: 'pending',
            timestamp: new Date().getTime()
          }],
          messages: [{ to: 'a', message: 'b' }]
        },
        {
          name: 'task4',
          state: 'random',
          timestamp: new Date().getTime(),
          state_history: [{
            state: 'pending',
            timestamp: new Date().getTime()
          }],
          messages: [{ to: 'a', message: 'b' }]
        },
      ]
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions).toBeDefined();
        expect(info.transitions.resolve_pending).toBeDefined();
        expect(info.transitions.resolve_pending.ok).toBe(true);
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        expect(updated.tasks.length).toEqual(2);
        expect(updated.tasks[0].state).toEqual('sent');
        expect(updated.tasks[0].state_history.length).toEqual(2);
        expect(updated.tasks[0].state_history[0].state).toEqual('pending');
        expect(updated.tasks[0].state_history[1].state).toEqual('sent');

        expect(updated.tasks[1].state).toEqual('sent');
        expect(updated.tasks[1].state_history.length).toEqual(2);
        expect(updated.tasks[1].state_history[0].state).toEqual('pending');
        expect(updated.tasks[1].state_history[1].state).toEqual('sent');

        expect(updated.scheduled_tasks.length).toEqual(2);
        expect(updated.scheduled_tasks[0].state).toEqual('sent');
        expect(updated.scheduled_tasks[0].state_history.length).toEqual(2);
        expect(updated.scheduled_tasks[0].state_history[0].state).toEqual('pending');
        expect(updated.scheduled_tasks[0].state_history[1].state).toEqual('sent');

        expect(updated.scheduled_tasks[1].state).toEqual('random');
        expect(updated.scheduled_tasks[1].state_history.length).toEqual(1);
        expect(updated.scheduled_tasks[1].state_history[0].state).toEqual('pending');
      });
  });
});
