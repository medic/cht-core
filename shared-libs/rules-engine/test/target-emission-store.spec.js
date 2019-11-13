const { expect } = require('chai');
const { RestorableTargetEmissionStore } = require('./mocks');
const sinon = require('sinon');

const targetEmissionStore = RestorableTargetEmissionStore();

const mockTargetDefinition = { id: 'target' };
const mockSettingsDoc = { tasks: { targets: { items: [mockTargetDefinition] } } };
const mockEmission = assigned => Object.assign({ id: '123', type: 'target', pass: true, contact: { _id: 'a', reported_date: 1 } }, assigned);

describe('target-emission-store', () => {
  afterEach(() => {
    sinon.restore();
    targetEmissionStore.restore();
  });

  it('throw on build twice', async () => {
    const state = { 'a': true };
    await targetEmissionStore.load(state, {});
    expect(() => targetEmissionStore.load(state, {})).to.throw('multiple times');
  });

  it('throw if not initialized', async () => {
    expect(() => targetEmissionStore.reset({})).to.throw('before call to');
  });

  it('add and update a single emission', () => {
    const cb = sinon.stub();
    targetEmissionStore.load(undefined, mockSettingsDoc, cb);
    expect(cb.callCount).to.eq(1);
    targetEmissionStore.storeTargetEmissions(['a'], [mockEmission()]);
    expect(targetEmissionStore.getTargets()).to.deep.eq([{
      id: 'target',
      pass: 1,
      total: 1,
    }]);
    expect(cb.callCount).to.eq(2);

    const another = mockEmission({ pass: false });
    targetEmissionStore.storeTargetEmissions(['a'], [another]);
    expect(targetEmissionStore.getTargets()).to.deep.eq([{
      id: 'target',
      pass: 0,
      total: 1,
    }]);
    expect(cb.callCount).to.eq(3);
  });
  
  it('emission for unknown target id is ignored', () => {
    const cb = sinon.stub();
    targetEmissionStore.load(undefined, mockSettingsDoc, cb);
    expect(cb.callCount).to.eq(1);
    targetEmissionStore.storeTargetEmissions(['a'], [mockEmission({ type: 'foo' })]);
    expect(cb.callCount).to.eq(1);
  });

  it('emission without contact is ignored', () => {
    targetEmissionStore.load(undefined, mockSettingsDoc);
    targetEmissionStore.storeTargetEmissions(['a'], [mockEmission({ contact: undefined })]);
    expect(targetEmissionStore.getTargets()).to.deep.eq([{
      id: 'target',
      pass: 0,
      total: 0,
    }]);
  });

  it('deleted emission is ignored', () => {
    targetEmissionStore.load(undefined, mockSettingsDoc);
    targetEmissionStore.storeTargetEmissions(['a'], [mockEmission({ deleted: true })]);
    expect(targetEmissionStore.getTargets()).to.deep.eq([{
      id: 'target',
      pass: 0,
      total: 0,
    }]);
  });

  it('can load what it passes to callback', () => {
    const cb = sinon.stub();
    targetEmissionStore.load(undefined, mockSettingsDoc, cb);
    targetEmissionStore.storeTargetEmissions(['a', 'b', 'c'], [mockEmission()]);
    const before = targetEmissionStore.getTargets();
    expect(cb.callCount).to.eq(2);
    const state = cb.args[1][0];

    targetEmissionStore.restore();
    targetEmissionStore.load(state, mockSettingsDoc, cb);
    expect(cb.callCount).to.eq(2);
    expect(targetEmissionStore.getTargets()).to.deep.eq(before);
    expect(before[0].total).to.eq(1);
  });

  it('add and remove an emission', () => {
    targetEmissionStore.load(undefined, mockSettingsDoc);
    targetEmissionStore.storeTargetEmissions(['a'], [mockEmission()]);
    targetEmissionStore.storeTargetEmissions(['a'], []);
    expect(targetEmissionStore.getTargets()).to.deep.eq([{
      id: 'target',
      pass: 0,
      total: 0,
    }]);
  });

  it('two contacts add emission and one removes (state change)', () => {
    targetEmissionStore.load(undefined, mockSettingsDoc);
    targetEmissionStore.storeTargetEmissions(['a'], [mockEmission()]);
    targetEmissionStore.storeTargetEmissions(['b'], [mockEmission({ pass: false, contact: { _id: 'b', reported_date: 2 } })]);
    
    expect(targetEmissionStore.getTargets()).to.deep.eq([{
      id: 'target',
      pass: 0,
      total: 1,
    }]);

    targetEmissionStore.storeTargetEmissions(['b'], []);
    expect(targetEmissionStore.getTargets()).to.deep.eq([{
      id: 'target',
      pass: 1,
      total: 1,
    }]);
  });

  it('three contacts add emission and two remove (no state change)', () => {
    targetEmissionStore.load(undefined, mockSettingsDoc);
    targetEmissionStore.storeTargetEmissions(['a', 'b'], [mockEmission({ pass: false, contact: { _id: 'b', reported_date: 2 } }), mockEmission({ contact: { _id: 'a', reported_date: 1 } })]);
    targetEmissionStore.storeTargetEmissions(['c'], [mockEmission({ contact: { _id: 'c', reported_date: 3 } })]);
    
    expect(targetEmissionStore.getTargets()).to.deep.eq([{
      id: 'target',
      pass: 1,
      total: 1,
    }]);

    targetEmissionStore.storeTargetEmissions(['a', 'dne', 'b'], []);
    expect(targetEmissionStore.getTargets()).to.deep.eq([{
      id: 'target',
      pass: 1,
      total: 1,
    }]);
  });

  it('two contacts add and remove emission', () => {
    targetEmissionStore.load(undefined, mockSettingsDoc);
    targetEmissionStore.storeTargetEmissions([], [mockEmission({ pass: false }), mockEmission({ pass: true, id: 'other' }), mockEmission({ pass: true, contact: { _id: 'b', reported_date: 2 } })]);
    
    expect(targetEmissionStore.getTargets()).to.deep.eq([{
      id: 'target',
      pass: 2,
      total: 2,
    }]);

    targetEmissionStore.storeTargetEmissions(['b', 'a'], []);
    expect(targetEmissionStore.getTargets()).to.deep.eq([{
      id: 'target',
      pass: 0,
      total: 0,
    }]);
  });

  it('instanceFilter isRelevant', () => {
    targetEmissionStore.load(undefined, mockSettingsDoc);
    targetEmissionStore.storeTargetEmissions([], [
      mockEmission({ pass: false, date: 1000, }),
      mockEmission({ pass: true, date: 2000, id: 'other' }),
      mockEmission({ pass: true, date: 3000, id: 'another' })
    ]);
    
    expect(targetEmissionStore.getTargets()).to.deep.eq([{
      id: 'target',
      pass: 2,
      total: 3,
    }]);

    const instanceFilter = instance => instance.date === 2000;
    expect(targetEmissionStore.getTargets(instanceFilter)).to.deep.eq([{
      id: 'target',
      pass: 1,
      total: 1,
    }]);
  });
});

