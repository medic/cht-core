const chai = require('chai');
const expect = chai.expect;
const moment = require('moment');
const sinon = require('sinon');
const TestRunner = require('cht-conf-test-harness');
const { newbornBaby } = require('../contacts');
const harness = new TestRunner({
  subject: newbornBaby,
});
let clock;

describe('Births this month target tests', () => {
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

  it('birth this month should be counted', async () => {
    //await harness.setNow('2000-04-30');//DOB: 2000-04-24
    clock = sinon.useFakeTimers(moment('2000-04-30').toDate());
    const birthsThisMonth = await harness.getTargets({ type: 'births-this-month' });
    expect(birthsThisMonth).to.have.property('length', 1);
    expect(birthsThisMonth[0]).to.nested.include({ 'value.pass': 1, 'value.total': 1 });
  });

  it('birth last month should not be counted', async () => {
    //await harness.setNow('2000-04-30');//DOB: 2000-04-24
    clock = sinon.useFakeTimers(moment('2000-05-01').toDate());
    const birthsThisMonth = await harness.getTargets({ type: 'births-this-month' });
    expect(birthsThisMonth).to.have.property('length', 1);
    expect(birthsThisMonth[0]).to.nested.not.include({ 'value.pass': 1, 'value.total': 1 });
  });
});
