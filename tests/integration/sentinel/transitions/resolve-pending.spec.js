const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const uuid = require('uuid').v4;
const { expect } = require('chai');

describe('resolve_pending', () => {
  after(() => utils.revertDb([], true));
  afterEach(() => utils.revertDb([], true));

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
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions)).to.be.empty;
      });
  });

  it('should be skipped when no pending tasks', () => {
    const settings = { transitions: { resolve_pending: false } };

    const doc = {
      _id: uuid(),
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions)).to.be.empty;
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
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions).to.not.be.undefined;
        expect(info.transitions.resolve_pending).to.not.be.undefined;
        expect(info.transitions.resolve_pending.ok).to.be.true;
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        expect(updated.tasks).to.have.lengthOf(2);
        expect(updated.tasks[0].state).to.equal('sent');
        expect(updated.tasks[0].state_history).to.have.lengthOf(2);
        expect(updated.tasks[0].state_history[0].state).to.equal('pending');
        expect(updated.tasks[0].state_history[1].state).to.equal('sent');

        expect(updated.tasks[1].state).to.equal('sent');
        expect(updated.tasks[1].state_history).to.have.lengthOf(2);
        expect(updated.tasks[1].state_history[0].state).to.equal('pending');
        expect(updated.tasks[1].state_history[1].state).to.equal('sent');

        expect(updated.scheduled_tasks).to.have.lengthOf(2);
        expect(updated.scheduled_tasks[0].state).to.equal('sent');
        expect(updated.scheduled_tasks[0].state_history).to.have.lengthOf(2);
        expect(updated.scheduled_tasks[0].state_history[0].state).to.equal('pending');
        expect(updated.scheduled_tasks[0].state_history[1].state).to.equal('sent');

        expect(updated.scheduled_tasks[1].state).to.equal('random');
        expect(updated.scheduled_tasks[1].state_history).to.have.lengthOf(1);
        expect(updated.scheduled_tasks[1].state_history[0].state).to.equal('pending');
      });
  });
});
