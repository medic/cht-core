const chai = require('chai');
const expect = chai.expect;
const moment = require('moment');
const sinon = require('sinon');
const TestRunner = require('cht-conf-test-harness');
const { babyDeceasedAtAge1Day } = require('../contacts');
const harness = new TestRunner();

let clock;

describe('Death related targets tests', () => {
  before(async () => {
    return await harness.start();
  });
  after(async () => {
    return await harness.stop();
  });
  beforeEach(async () => {
    await harness.clear();
  });
  afterEach(() => {
    expect(harness.consoleErrors).to.be.empty;
    if (clock) {clock.restore();}
  });

  it('death this month target test this month', async () => {
    //await harness.setNow('2000-04-30');//DOD: 2000-04-25
    clock = sinon.useFakeTimers(moment('2000-04-30').toDate());
    harness.subject = babyDeceasedAtAge1Day;
    const birthsThisMonth = await harness.getTargets({ type: 'deaths-this-month' });
    expect(birthsThisMonth).to.have.property('length', 1);
    expect(birthsThisMonth[0]).to.nested.include({ 'value.pass': 1, 'value.total': 1 });
  });

  it('death this month target test next month', async () => {
    //await harness.setNow('2000-04-30');//DOD: 2000-04-25
    clock = sinon.useFakeTimers(moment('2000-05-30').toDate());
    harness.subject = babyDeceasedAtAge1Day;
    const birthsThisMonth = await harness.getTargets({ type: 'deaths-this-month' });
    expect(birthsThisMonth).to.have.property('length', 1);
    expect(birthsThisMonth[0]).to.nested.not.include({ 'value.pass': 1, 'value.total': 1 });
  });

});
