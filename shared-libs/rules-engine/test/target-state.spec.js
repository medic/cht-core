const { expect } = require('chai');
const sinon = require('sinon');

const targetState = require('../src/target-state');

const mockTargetDefinition = () => ({ id: 'target' });
const mockTargets = (items = [mockTargetDefinition()]) => items;
const mockEmission = assigned => Object.assign(
  { _id: '123', type: 'target', pass: true, contact: { _id: 'a', reported_date: 1 } },
  assigned
);
const calendarInterval = require('@medic/calendar-interval');

describe('target-state', () => {
  const interval = calendarInterval.getCurrent();
  afterEach(() => sinon.restore());

  it('empty settings doc yields empty state', () => {
    const state = targetState.createEmptyState([]);
    expect(state).to.deep.eq({ targets: {}, aggregate: {} });
  });

  it('an empty state', () => {
    const state = targetState.createEmptyState(mockTargets());
    expect(state).to.deep.eq({
      targets: {
        target: {
          emissions: {},
          id: 'target',
        },
      },
      aggregate: {}
    });
  });

  it('add and update a single emission', () => {
    const state = targetState.createEmptyState(mockTargets());

    targetState.storeTargetEmissions(state, ['a'], [mockEmission()]);
    expect(targetState.aggregateStoredTargetEmissions(state, interval).aggregate.targets).to.deep.eq([{
      id: 'target',
      value: { pass: 1, total: 1 },
    }]);

    const another = mockEmission({ pass: false });
    targetState.storeTargetEmissions(state, ['a'], [another]);
    expect(targetState.aggregateStoredTargetEmissions(state, interval).aggregate.targets).to.deep.eq([{
      id: 'target',
      value: { pass: 0, total: 1 },
    }]);
  });

  it('emission for unknown target id is ignored', () => {
    const state = targetState.createEmptyState(mockTargets());
    targetState.storeTargetEmissions(state, ['a'], [mockEmission({ type: 'foo' })]);
    expect(state).to.deep.eq(targetState.createEmptyState(mockTargets()));
  });

  it('emission without contact is ignored', () => {
    const state = targetState.createEmptyState(mockTargets());
    targetState.storeTargetEmissions(state, ['a'], [mockEmission({ contact: undefined })]);
    expect(targetState.aggregateStoredTargetEmissions(state, interval).aggregate.targets).to.deep.eq([{
      id: 'target',
      value: { pass: 0, total: 0 },
    }]);
  });

  it('deleted emission is ignored', () => {
    const state = targetState.createEmptyState(mockTargets());
    targetState.storeTargetEmissions(state, ['a'], [mockEmission({ deleted: true })]);
    expect(targetState.aggregateStoredTargetEmissions(state, interval).aggregate.targets).to.deep.eq([{
      id: 'target',
      value: { pass: 0, total: 0 },
    }]);
  });

  it('add and remove an emission', () => {
    const state = targetState.createEmptyState(mockTargets());
    targetState.storeTargetEmissions(state, ['a'], [mockEmission()]);
    targetState.storeTargetEmissions(state, ['a'], []);
    expect(targetState.aggregateStoredTargetEmissions(state, interval).aggregate.targets).to.deep.eq([{
      id: 'target',
      value: { pass: 0, total: 0 },
    }]);
  });

  it('two contacts add emission and one removes (state change)', () => {
    const state = targetState.createEmptyState(mockTargets());
    targetState.storeTargetEmissions(state, ['a'], [mockEmission()]);
    targetState.storeTargetEmissions(state, ['b'], [mockEmission({
      pass: false, contact: { _id: 'b', reported_date: 2 }
    })]);

    expect(targetState.aggregateStoredTargetEmissions(state, interval).aggregate.targets).to.deep.eq([{
      id: 'target',
      value: { pass: 0, total: 1 },
    }]);

    targetState.storeTargetEmissions(state, ['b'], []);
    expect(targetState.aggregateStoredTargetEmissions(state, interval).aggregate.targets).to.deep.eq([{
      id: 'target',
      value: { pass: 1, total: 1 },
    }]);
  });

  it('three contacts add emission and two remove (no state change)', () => {
    const state = targetState.createEmptyState(mockTargets());
    targetState.storeTargetEmissions(state, ['a', 'b'], [
      mockEmission({ pass: false, contact: { _id: 'b', reported_date: 2 } }),
      mockEmission({ contact: { _id: 'a', reported_date: 1 } })
    ]);
    targetState.storeTargetEmissions(state, ['c'], [mockEmission({ contact: { _id: 'c', reported_date: 3 } })]);

    expect(targetState.aggregateStoredTargetEmissions(state, interval).aggregate.targets).to.deep.eq([{
      id: 'target',
      value: { pass: 1, total: 1 },
    }]);

    targetState.storeTargetEmissions(state, ['a', 'dne', 'b'], []);
    expect(targetState.aggregateStoredTargetEmissions(state, interval).aggregate.targets).to.deep.eq([{
      id: 'target',
      value: { pass: 1, total: 1 },
    }]);
  });

  it('two contacts add and remove emission', () => {
    const targets = mockTargets();
    targets[0].type = 'percent';

    const state = targetState.createEmptyState(targets);
    targetState.storeTargetEmissions(state, [], [
      mockEmission({ pass: false }),
      mockEmission({ pass: true, _id: 'other' }),
      mockEmission({ pass: true, contact: { _id: 'b', reported_date: 2 } })
    ]);

    expect(targetState.aggregateStoredTargetEmissions(state, interval).aggregate.targets).to.deep.eq([{
      id: 'target',
      type: 'percent',
      value: {
        pass: 2,
        total: 2,
        percent: 100,
      },
    }]);

    targetState.storeTargetEmissions(state, ['b', 'a'], []);
    expect(targetState.aggregateStoredTargetEmissions(state, interval).aggregate.targets).to.deep.eq([{
      id: 'target',
      type: 'percent',
      value: {
        pass: 0,
        total: 0,
        percent: 0,
      },
    }]);
  });

  it('custom filter interval', () => {
    const state = targetState.createEmptyState(mockTargets());
    targetState.storeTargetEmissions(state, [], [
      mockEmission({ pass: false, date: 1000, }),
      mockEmission({ pass: true, date: 2000, _id: 'other' }),
      mockEmission({ pass: true, date: 3000, _id: 'another' })
    ]);

    const interval1 = { start: 1000, end: 3000 };
    expect(targetState.aggregateStoredTargetEmissions(state, interval1).aggregate.targets).to.deep.eq([{
      id: 'target',
      value: { pass: 2, total: 3 },
    }]);

    const interval2 = { start: 2000, end: 2000 };
    expect(targetState.aggregateStoredTargetEmissions(state, interval2).aggregate.targets).to.deep.eq([{
      id: 'target',
      value: { pass: 1, total: 1 },
    }]);
  });

  describe('groupBy', () => {
    it('one passing, one failing', () => {
      const targets = [{
        id: 'target',
        passesIfGroupCount: { gte: 2 },
      }];
      const state = targetState.createEmptyState(targets);
      targetState.storeTargetEmissions(state, [], [
        mockEmission({ _id: 'a', groupBy: '1', pass: true }),
        mockEmission({ _id: 'b', groupBy: '2', pass: false }), // pass should have no effect
        mockEmission({ _id: 'c', groupBy: '1', pass: true }),
        mockEmission({ _id: 'd', groupBy: '1', pass: false }),
        mockEmission({ _id: 'e', groupBy: '3', pass: false }),
        mockEmission({ _id: 'f', groupBy: '3', pass: true }),
      ]);
      expect(targetState.aggregateStoredTargetEmissions(state, interval).aggregate.targets).to.deep.eq([{
        id: 'target',
        value: { pass: 1, total: 3 },
      }]);
    });

    it('failing only because of contact ordering', () => {
      const targets = [{
        id: 'target',
        passesIfGroupCount: { gte: 2 },
      }];
      const state = targetState.createEmptyState(targets);
      targetState.storeTargetEmissions(state, [], [
        mockEmission({ _id: 'a', groupBy: '1', contact: { _id: 'c1', reported_date: 1 } }),
        mockEmission({ _id: 'a', groupBy: '3', contact: { _id: 'c2', reported_date: 2 } }),
        mockEmission({ _id: 'b', groupBy: '2' }),
        mockEmission({ _id: 'c', groupBy: '1' }),
      ]);
      expect(targetState.aggregateStoredTargetEmissions(state, interval).aggregate.targets).to.deep.eq([{
        id: 'target',
        value: { pass: 0, total: 3 },
      }]);
    });

    it('failing because of targetEmissionFilter', () => {
      const targets = [{
        id: 'target',
        passesIfGroupCount: { gte: 2 },
      }];
      const state = targetState.createEmptyState(targets);
      targetState.storeTargetEmissions(state, [], [
        mockEmission({ _id: 'a', groupBy: '1', contact: { _id: 'c1', reported_date: 1 }, date: 2000 }),
        mockEmission({ _id: 'a', groupBy: '3', contact: { _id: 'c2' }, date: 1000 }),
        mockEmission({ _id: 'b', groupBy: '2', date: 3000 }),
        mockEmission({ _id: 'c', groupBy: '1', date: 1000 }),
      ]);
      const interval = { start: 1000, end: 1000 };
      expect(targetState.aggregateStoredTargetEmissions(state, interval).aggregate.targets).to.deep.eq([{
        id: 'target',
        value: { pass: 0, total: 2 },
      }]);
    });
  });

  describe('visible', () => {
    it('one missing, one visible, one invisible', () => {
      const targets = [
        {
          id: 'target1',
        },
        {
          id: 'target2',
          visible: true,
        },
        {
          id: 'target3',
          visible: false,
        }
      ];
      const state = targetState.createEmptyState(targets);
      targetState.storeTargetEmissions(state, [], [
        mockEmission({ _id: 'a', type: 'target1' }),
        mockEmission({ _id: 'b', type: 'target2' }),
        mockEmission({ _id: 'c', type: 'target3' }),
      ]);
      expect(targetState.aggregateStoredTargetEmissions(state, interval).aggregate.targets).to.deep.eq([
        {
          id: 'target1',
          value: { pass: 1, total: 1 },
        },
        {
          id: 'target2',
          value: { pass: 1, total: 1 },
          visible: true,
        },
        {
          id: 'target3',
          value: { pass: 1, total: 1 },
          visible: false,
        },
      ]);
    });
  });

  describe('isStale', () => {
    it('should return true if state is invalid', () => {
      expect(targetState.isStale()).to.equal(true);
      expect(targetState.isStale({})).to.equal(true);
      expect(targetState.isStale({ oldTarget: { emissions: [] } })).to.equal(true);
      expect(targetState.isStale({ targets: {} })).to.equal(true);
      expect(targetState.isStale({ aggregate: {} })).to.equal(true);
    });
    
    it('should return false if state is valid', () => {
      expect(targetState.isStale({ targets: {}, aggregate: {} })).to.equal(false);
    });
  });
});

