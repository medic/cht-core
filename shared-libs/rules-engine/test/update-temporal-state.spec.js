const { expect } = require('chai');
const sinon = require('sinon');

const { MS_IN_DAY, mockEmission } = require('./mocks');
const transformToDoc = require('../src/transform-task-emission-to-doc');
const updateTemporalStates = require('../src/update-temporal-states');

let clock;
const NOW = 1000;

describe('update-temporal-states', () => {
  beforeEach(() => {
    clock = sinon.useFakeTimers(NOW);
  });

  afterEach(() => {
    clock && clock.restore();
    sinon.restore();
  });

  it('empty task docs yields empty result', () => {
    expect(updateTemporalStates([])).to.deep.eq([]);
  });

  it('a document updates from draft to ready to failed', () => {
    const draftEmission = mockEmission(MS_IN_DAY + 10);
    const { taskDoc } = transformToDoc(draftEmission, Date.now());
    expect(updateTemporalStates([taskDoc])).to.deep.eq([]);
    expect(taskDoc).to.nested.include({
      state: 'Draft',
      'stateHistory[0].state': 'Draft',
    });

    clock.tick(MS_IN_DAY + 10);
    expect(updateTemporalStates([taskDoc])).to.deep.eq([taskDoc]);
    expect(taskDoc).to.nested.include({
      state: 'Ready',
      'stateHistory[0].state': 'Draft',
      'stateHistory[1].state': 'Ready',
    });

    clock.tick(MS_IN_DAY * 3);
    expect(updateTemporalStates([taskDoc])).to.deep.eq([taskDoc]);
    expect(taskDoc).to.nested.include({
      state: 'Failed',
      'stateHistory[0].state': 'Draft',
      'stateHistory[1].state': 'Ready',
      'stateHistory[2].state': 'Failed',
    });
  });

  it('draft doc is canceled when authoredOn is in future', () => {
    const draftEmission = mockEmission(MS_IN_DAY + 10);
    const { taskDoc } = transformToDoc(draftEmission, Date.now());
    taskDoc.authoredOn = Date.now() + 1000;
    expect(updateTemporalStates([taskDoc])).to.deep.eq([taskDoc]);
    expect(taskDoc).to.nested.include({
      state: 'Cancelled',
      'stateHistory[0].state': 'Draft',
      'stateHistory[1].state': 'Cancelled'
    });
  });

  it('failed doc is not canceled when authoredOn is in future', () => {
    const failedEmission = mockEmission(-MS_IN_DAY - 10);
    const { taskDoc } = transformToDoc(failedEmission, Date.now());
    taskDoc.authoredOn = Date.now() + 1000;
    expect(updateTemporalStates([taskDoc])).to.deep.eq([]);
  });

  it('cannot move from failed to ready', () => {
    const draftEmission = mockEmission(-MS_IN_DAY * 3);
    const { taskDoc } = transformToDoc(draftEmission, Date.now());
    expect(updateTemporalStates([taskDoc])).to.deep.eq([]);
    expect(taskDoc).to.nested.include({
      state: 'Failed',
      'stateHistory[0].state': 'Failed',
    });

    clock.tick(MS_IN_DAY * 3);
    expect(updateTemporalStates([taskDoc])).to.deep.eq([]);
  });
});
