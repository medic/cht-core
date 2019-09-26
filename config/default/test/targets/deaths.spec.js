const chai = require('chai');
const expect = chai.expect;
const path = require('path');
const moment = require('moment');
const sinon = require('sinon');
const TestRunner = require('medic-conf-test-harness');
const { babyDeceasedAtAge1Day, babyDeceasedAtAgeJustUnder5Years, babyDeceasedAtAge5Years } = require('../contacts');
const harness = new TestRunner({
  xformFolderPath: path.join(__dirname, '../../forms/app'),
});

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
    harness.state.contacts.push(babyDeceasedAtAge1Day);
    let birthsThisMonth = await harness.getTargets({ type: 'deaths-this-month' });
    expect(birthsThisMonth).to.have.property('length', 1);
    expect(birthsThisMonth[0]).to.nested.include({ 'value.pass': 1, 'value.total': 1 });
  });

  it('death this month target test next month', async () => {
    //await harness.setNow('2000-04-30');//DOD: 2000-04-25
    clock = sinon.useFakeTimers(moment('2000-05-30').toDate());
    harness.state.contacts.push(babyDeceasedAtAge1Day);
    let birthsThisMonth = await harness.getTargets({ type: 'deaths-this-month' });
    expect(birthsThisMonth).to.have.property('length', 1);
    expect(birthsThisMonth[0]).to.nested.not.include({ 'value.pass': 1, 'value.total': 1 });
  });

  it('newborn mortality target should count baby deceased at age: 1 day', async () => {
    //await harness.setNow('2000-04-30');//DOB: 2000-04-24, DOD: 2000-04-25
    clock = sinon.useFakeTimers(moment('2000-05-01').toDate());
    harness.state.contacts.push(babyDeceasedAtAge1Day);
    let birthsThisMonth = await harness.getTargets({ type: 'newborn-mortality' });
    expect(birthsThisMonth).to.have.property('length', 1);
    expect(birthsThisMonth[0]).to.nested.include({ 'value.pass': 1, 'value.total': 1 });
  });

  it('newborn mortality target should also count baby deceased at age: 1825 days', async () => {
    //await harness.setNow('2000-04-30');//DOB: 1999-04-27, DOD: 2000-04-25 (1826 days ~ 5 years)
    clock = sinon.useFakeTimers(moment('2000-04-25').toDate());
    harness.state.contacts.push(babyDeceasedAtAgeJustUnder5Years);
    let birthsThisMonth = await harness.getTargets({ type: 'newborn-mortality' });
    expect(birthsThisMonth).to.have.property('length', 1);
    expect(birthsThisMonth[0]).to.nested.include({ 'value.pass': 1, 'value.total': 1 });//Also babyDeceasedAtAge1Day
  });

  it('newborn mortality target should not count baby deceased at age: 1826 days', async () => {
    //await harness.setNow('2000-04-30');//DOB: 1999-04-26, DOD: 2000-04-25 (1826 days ~ 5 years)
    clock = sinon.useFakeTimers(moment('2000-04-25').toDate());
    harness.state.contacts.push(babyDeceasedAtAge5Years);
    let birthsThisMonth = await harness.getTargets({ type: 'newborn-mortality' });
    expect(birthsThisMonth).to.have.property('length', 1);
    expect(birthsThisMonth[0]).to.nested.not.include({ 'value.pass': 1, 'value.total': 1 });
  });

});