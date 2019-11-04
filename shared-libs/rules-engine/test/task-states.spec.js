const { expect } = require('chai');
const { MS_IN_DAY, mockEmission } = require('./mocks');
const sinon = require('sinon');
const TaskStates = require('../src/task-states');

const definedStates = Object.keys(TaskStates).filter(key => typeof TaskStates[key] === 'string');

const NOW = 7200000000;

describe('task-states', () => {
  before(() => sinon.useFakeTimers(NOW));
  after(() => sinon.restore());

  it('definedStates', () => expect(definedStates.length).to.eq(5));

  it('cancelled is terminal state', () => expect(TaskStates.isTerminal(TaskStates.Cancelled)).to.be.true);

  describe('calculateState', () => {
    it('ready', () => {
      const emission = mockEmission(0);
      expect(TaskStates.calculateState(emission, Date.now())).to.eq('Ready');
    });

    it('resolved yields completed', () => {
      const emission = mockEmission(0, { resolved: true });
      expect(TaskStates.calculateState(emission, Date.now())).to.eq('Completed');
    });

    it('deleted yields cancelled', () => {
      const emission = mockEmission(0, { deleted: true });
      expect(TaskStates.calculateState(emission, Date.now())).to.eq('Cancelled');
    });

    it('invalid data yields falsey', () => {
      const first = mockEmission(0, { startTime: 2, endTime: 1 });
      expect(TaskStates.calculateState(first, Date.now())).to.eq(false);

      const second = mockEmission(0, { startTime: undefined });
      expect(TaskStates.calculateState(second, Date.now())).to.eq(false);
    });

    it('future window yields draft', () => {
      const emission = mockEmission(MS_IN_DAY + 1);
      expect(TaskStates.calculateState(emission, Date.now())).to.eq('Draft');
    });

    it('expired window yields failed', () => {
      const emission = mockEmission(-MS_IN_DAY - 1);
      expect(TaskStates.calculateState(emission, Date.now())).to.eq('Failed');
    });
  });

  describe('setStateOnTaskDoc', () => {
    it('undefined taskDoc yields undefined', () => {
      expect(TaskStates.setStateOnTaskDoc(undefined, TaskStates.Ready)).to.be.undefined;
    });

    it('create new stateHistory', () => {
      expect(TaskStates.setStateOnTaskDoc({}, TaskStates.Ready)).to.deep.eq({
        state: 'Ready',
        stateHistory: [{
          state: 'Ready',
          timestamp: NOW,
        }],
      });
    });

    it('append to stateHistory', () => {
      expect(TaskStates.setStateOnTaskDoc({ stateHistory: ['foo', 'bar', { state: 'Cancelled' }] }, TaskStates.Ready)).to.deep.eq({
        state: 'Ready',
        stateHistory: [
          'foo',
          'bar',
          { state: 'Cancelled' },
          {
            state: 'Ready',
            timestamp: NOW,
          }],
      });
    });

    it('no append when state is the same', () => {
      expect(TaskStates.setStateOnTaskDoc({ state: 'Ready', stateHistory: [{ state: 'Cancelled' }] }, TaskStates.Cancelled)).to.deep.eq({
        state: 'Cancelled',
        stateHistory: [{ state: 'Cancelled' }],
      });
    });

    it('falsey state yields cancelled', () => {
      expect(TaskStates.setStateOnTaskDoc({}, false)).to.deep.eq({
        state: 'Cancelled',
        stateReason: 'invalid',
        stateHistory: [{
          state: 'Cancelled',
          timestamp: NOW,
        }],
      });
    });

    it('can go back to old state history', () => {
      const taskDoc = {};
      TaskStates.setStateOnTaskDoc(taskDoc, TaskStates.Ready, 1);
      TaskStates.setStateOnTaskDoc(taskDoc, TaskStates.Failed, 2);
      TaskStates.setStateOnTaskDoc(taskDoc, TaskStates.Cancelled, 3);
      TaskStates.setStateOnTaskDoc(taskDoc, TaskStates.Ready, 4);
      expect(taskDoc).to.deep.eq({
        state: 'Ready',
        stateHistory: [
          {
            state: 'Ready',
            timestamp: 1,
          },
          {
            state: 'Failed',
            timestamp: 2,
          },
          {
            state: 'Cancelled',
            timestamp: 3,
          },
          {
            state: 'Ready',
            timestamp: 4,
          },
        ]
      });
    });
  });

  describe('mostReadyComparator', () => {
    it('all defined states better than undefined', () => {
      const actual = definedStates.some(state => !TaskStates.isMoreReadyThan(state, undefined));
      expect(actual).to.be.false;
    });

    it('ready is more ready than unknown', () => expect(TaskStates.isMoreReadyThan(TaskStates.Ready, 'unknown')).to.be.true);
    it('ready is more ready than draft', () => expect(TaskStates.isMoreReadyThan(TaskStates.Ready, TaskStates.Draft)).to.be.true);
    it('ready is not more ready than ready', () => expect(TaskStates.isMoreReadyThan(TaskStates.Ready, TaskStates.Ready)).to.be.false);
    it('draft is less ready than ready', () => expect(TaskStates.isMoreReadyThan(TaskStates.Draft, TaskStates.Ready)).to.be.false);
  });
});
