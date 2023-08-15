const chai = require('chai');
const expect = chai.expect;
const TestRunner = require('cht-conf-test-harness');
const { deliveryReportScenarios } = require('../form-inputs');
const harness = new TestRunner();

describe('Delivery in facility target tests', () => {
  before(async () => {
    return await harness.start();
  });
  after(async () => {
    return await harness.stop();
  });
  beforeEach(async () => {
    await harness.clear();
    //await harness.setNow(now);
    //await harness.flush(1);
    return await harness.loadForm('delivery');
  });
  afterEach(() => { expect(harness.consoleErrors).to.be.empty; });

  it('Delivery in facility should be counted', async () => {
    await harness.setNow('2000-04-30');//10 weeks after LMP date
    //let clock = sinon.useFakeTimers(moment('2000-04-30').toDate());
    let facilityDeliveries = await harness.getTargets({ type: 'facility-deliveries' });
    expect(facilityDeliveries[0]).to.nested.not.include({ 'value.pass': 1 });
    expect(facilityDeliveries[0]).to.nested.not.include({ 'value.total': 1 });

    const delivery = await harness.fillForm('delivery', ...deliveryReportScenarios.oneChildHealthyFacility);
    expect(delivery.errors).to.be.empty;
    //await harness.setNow('1999-08-01');
    //await harness.flush(day);
    facilityDeliveries = await harness.getTargets({ type: 'facility-deliveries' });
    expect(facilityDeliveries).to.have.property('length', 1);
    expect(facilityDeliveries[0]).to.nested.include({ 'value.pass': 1, 'value.total': 1 });

  });

  it('Delivery in home should not be counted as delivery in facility', async () => {
    await harness.setNow('2000-04-30');//10 weeks after LMP date
    //let clock = sinon.useFakeTimers(moment('2000-04-30').toDate());

    const delivery = await harness.fillForm('delivery', ...deliveryReportScenarios.oneChildHealthyHome);
    expect(delivery.errors).to.be.empty;
    //await harness.setNow('1999-08-01');
    //await harness.flush(day);
    const facilityDeliveries = await harness.getTargets({ type: 'facility-deliveries' });
    expect(facilityDeliveries[0]).to.nested.include({ 'value.pass': 0 });
    expect(facilityDeliveries[0]).to.nested.include({ 'value.total': 1 });

  });
});
