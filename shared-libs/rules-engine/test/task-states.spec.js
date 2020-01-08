const { expect } = require('chai');
const moment = require('moment');
const rewire = require('rewire');
const sinon = require('sinon');

const { MS_IN_DAY, mockEmission } = require('./mocks');
const TaskStates = rewire('../src/task-states');

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
      const first = mockEmission(0, { readyStart: 0, readyEnd: -5 });
      expect(TaskStates.calculateState(first, Date.now())).to.eq(false);

      const second = mockEmission(
        0,
        { readyStart: undefined, readyEnd: undefined, date: undefined, startDate: undefined }
      );
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
      const actual = TaskStates.setStateOnTaskDoc(
        { stateHistory: ['foo', 'bar', { state: 'Cancelled' }] },
        TaskStates.Ready
      );
      expect(actual).to.deep.eq({
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
      const actual = TaskStates.setStateOnTaskDoc(
        { state: 'Ready', stateHistory: [{ state: 'Cancelled' }] },
        TaskStates.Cancelled
      );
      expect(actual).to.deep.eq({
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

  describe('isTimely', () => {
    it('old emission is not timely', () => {
      const emission = mockEmission(-MS_IN_DAY * 90);
      expect(TaskStates.isTimely(emission)).to.be.false;
    });

    it('new emission is timely', () => {
      const emission = mockEmission(-MS_IN_DAY);
      expect(TaskStates.isTimely(emission)).to.be.true;
    });
  });

  describe('mostReadyComparator', () => {
    it('all defined states better than undefined', () => {
      const actual = definedStates.some(state => !TaskStates.isMoreReadyThan(state, undefined));
      expect(actual).to.be.false;
    });

    it('ready is more ready than unknown', () => expect(TaskStates.isMoreReadyThan(TaskStates.Ready, 'unknown'))
      .to.be.true);
    it('ready is more ready than draft', () => expect(TaskStates.isMoreReadyThan(TaskStates.Ready, TaskStates.Draft))
      .to.be.true);
    it('ready not more ready than ready', () => expect(TaskStates.isMoreReadyThan(TaskStates.Ready, TaskStates.Ready))
      .to.be.false);
    it('draft is less ready than ready', () => expect(TaskStates.isMoreReadyThan(TaskStates.Draft, TaskStates.Ready))
      .to.be.false);
  });

  it('formatString is comparable', () => {
    const formatString = TaskStates.__get__('formatString');
    expect(formatString).to.not.be.undefined;
    
    const larger = moment('20000101', 'YYYYMMDD');
    const smaller = larger.clone().subtract(1, 'day');
    for (let i = 0; i < 367; i++) {
      expect(larger.format(formatString) > smaller.format(formatString)).to.be.true;
      expect(smaller.format(formatString) < larger.format(formatString)).to.be.true;
      larger.add(1, 'day');
      smaller.add(1, 'day');
    }
  });
});
