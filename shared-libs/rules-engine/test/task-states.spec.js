const { expect } = require('chai');
const moment = require('moment');
const rewire = require('rewire');
const sinon = require('sinon');

const { MS_IN_DAY, mockEmission } = require('./mocks');
const TaskStates = rewire('../src/task-states');

const definedStates = Object.keys(TaskStates).filter(key => typeof TaskStates[key] === 'string');

const NOW = 7200000000;
let clock;

describe('task-states', () => {
  beforeEach(() => {
    clock = sinon.useFakeTimers(NOW);
  });
  afterEach(() => {
    sinon.restore();
    clock.restore();
  });

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
          }
        ],
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

    it('should save reason when provided', () => {
      const actual = TaskStates.setStateOnTaskDoc(
        { state: 'Ready', stateHistory: [{ state: 'Ready' }] },
        TaskStates.Cancelled,
        4,
        'cancel reason'
      );
      expect(actual).to.deep.eq({
        state: 'Cancelled',
        stateReason: 'cancel reason',
        stateHistory: [
          { state: 'Ready' },
          { state: 'Cancelled', timestamp: 4 },
        ],
      });
    });
  });

  describe('isTimely', () => {

    let OUTSIDE_WINDOW_START;
    let OUTSIDE_WINDOW_END;
    let WITHIN_WINDOW_START;
    let WITHIN_WINDOW_END;

    before(() => {
      OUTSIDE_WINDOW_START = new Date(Date.now() - (MS_IN_DAY * 61)); // one day before window start
      OUTSIDE_WINDOW_END = new Date(Date.now() + (MS_IN_DAY * 181)); // one day after window end
      WITHIN_WINDOW_START = new Date(Date.now() - (MS_IN_DAY * 59)); // one day after window start
      WITHIN_WINDOW_END = new Date(Date.now() + (MS_IN_DAY * 179)); // one day before window end
    });

    it('old emission is not timely', () => {
      const emission = mockEmission(0, { date: OUTSIDE_WINDOW_START });
      expect(TaskStates.isTimely(emission, Date.now())).to.be.false;
    });

    it('future emission is not timely', () => {
      const emission = mockEmission(0, { date: OUTSIDE_WINDOW_END });
      expect(TaskStates.isTimely(emission, Date.now())).to.be.false;
    });

    it('invalid date is not timely', () => {
      const emission = mockEmission(0, { date: 'abc' });
      expect(TaskStates.isTimely(emission, Date.now())).to.be.false;
    });

    it('59 day old emission is timely', () => {
      const emission = mockEmission(0, { date: WITHIN_WINDOW_START });
      expect(TaskStates.isTimely(emission, Date.now())).to.be.true;
    });

    it('emission for 179 days away is timely', () => {
      const emission = mockEmission(0, { date: WITHIN_WINDOW_END });
      expect(TaskStates.isTimely(emission, Date.now())).to.be.true;
    });

    it('emission with custom window uses end date for start of window', () => {
      const emission = mockEmission(0, {
        startDate: OUTSIDE_WINDOW_START,
        endDate: WITHIN_WINDOW_START
      });
      expect(TaskStates.isTimely(emission, Date.now())).to.be.true;
    });

    it('emission with custom window uses start date for end of window', () => {
      const emission = mockEmission(0, {
        startDate: WITHIN_WINDOW_END,
        endDate: OUTSIDE_WINDOW_END
      });
      expect(TaskStates.isTimely(emission, Date.now())).to.be.true;
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

  describe('state Comparator', () => {
    it('should return number comparator', () => {
      expect(TaskStates.compareState(TaskStates.Ready, 'unknown')).to.be.below(0);
      expect(TaskStates.compareState(TaskStates.Ready, TaskStates.Draft)).to.be.below(0);
      expect(TaskStates.compareState(TaskStates.Draft, TaskStates.Ready)).to.be.above(0);
      expect(TaskStates.compareState(TaskStates.Draft, TaskStates.Cancelled)).to.be.below(0);
      expect(TaskStates.compareState(TaskStates.Draft, TaskStates.Draft)).to.equal(0);
      expect(TaskStates.compareState(TaskStates.Ready, TaskStates.Ready)).to.equal(0);
    });
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
