const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-like'));
chai.use(require('chai-things'));
const moment = require('moment');
const sinon = require('sinon');
const TestRunner = require('cht-conf-test-harness');
const { getRangeForTask, getTaskTestDays } = require('../test-helpers');
const { pregnancyRegistrationScenarios, pregnancyHomeVisitScenarios, deliveryReportScenarios } = require('../form-inputs');
const harness = new TestRunner();

const MAX_DAYS_FOR_DELIVERY = 336;
let clock;
describe('Delivery tasks tests', () => {
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
    return await harness.loadForm('pregnancy');
  });
  afterEach(() => {
    expect(harness.consoleErrors).to.be.empty;
    if (clock) {clock.restore();}
  });

  //ANC Home Visit: 12, 20, 26, 30, 34, 36, 38, 40 weeks (Known LMP)
  //show from 7 days before due date, show until 14 days after due date
  //Register date: 1999-10-10
  //LMP: 1999-08-01
  //LMP+12 weeks: 1999-10-24 (From: 1999-10-17, To: 1999-11-07)
  //LMP+20 weeks: 1999-12-19 (From: 1999-12-12, To: 2000-01-02)

  const deliveryTask = {
    pre: 28,
    post: 42,
    triggers: [42],
    triggerUnit: 'weeks'
  };


  const deliveryTaskDays = getRangeForTask(deliveryTask);

  it('delivery task should show', async () => {
    await harness.setNow('1999-10-10');//10 weeks after LMP date
    const pregnancy = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.safe10Weeks);
    expect(pregnancy.errors).to.be.empty;
    for (const day of getTaskTestDays(70, MAX_DAYS_FOR_DELIVERY, deliveryTask, 7)) {
      await harness.setNow('1999-08-01');//LMP date
      await harness.flush(day);
      clock = sinon.useFakeTimers(moment('1999-08-01').add(day, 'days').toDate());
      const taskForDelivery = await harness.getTasks({ title: 'task.anc.delivery.title' });

      if (deliveryTaskDays.includes(day)) {
        expect(taskForDelivery.length, day).to.equal(1);
      }

      else {
        expect(taskForDelivery.length, day).to.equal(0);
      }
    }
  });

  it('delivery task should clear', async () => {
    await harness.setNow('1999-10-10');//10 weeks after LMP date
    const pregnancy = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.safe10Weeks);
    expect(pregnancy.errors).to.be.empty;
    let cleared = false;
    for (const day of getTaskTestDays(0, MAX_DAYS_FOR_DELIVERY, deliveryTask, 7)) {
      await harness.setNow('1999-08-01');//10 weeks after LMP date
      await harness.flush(day);
      clock = sinon.useFakeTimers(moment('1999-08-01').add(day, 'days').toDate());
      const taskForDelivery = await harness.getTasks({ title: 'task.anc.delivery.title' });

      if (deliveryTaskDays.includes(day) && cleared === false) {
        //expect(taskForDelivery).to.have.property('length', 1);
        expect(taskForDelivery.length).to.eq(1);
        await harness.loadForm('pregnancy_home_visit');
        const followupFormResult = await harness.fillForm(...pregnancyHomeVisitScenarios.clearAll);
        expect(followupFormResult.errors).to.be.empty;
        const tasksAfterDangerSignsFollowUp = await harness.getTasks();
        expect(tasksAfterDangerSignsFollowUp).to.be.empty;
        cleared = true;
      }

      else {
        expect(taskForDelivery).to.be.an('array').that.does.not.contain.something.like({ title: 'task.anc.delivery.title' });
      }
    }
  });

  it('delivery task should resolve', async () => {
    await harness.setNow('1999-10-10');//10 weeks after LMP date
    const pregnancy = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.safe10Weeks);
    expect(pregnancy.errors).to.be.empty;
    let resolved = false;
    for (const day of getTaskTestDays(70, MAX_DAYS_FOR_DELIVERY, deliveryTask, 7)) {
      await harness.setNow('1999-08-01');//10 weeks after LMP date
      await harness.flush(day);
      clock = sinon.useFakeTimers(moment('1999-08-01').add(day, 'days').toDate());
      const taskForDelivery = await harness.getTasks({ title: 'task.anc.delivery.title' });
      if (deliveryTaskDays.includes(day) && resolved === false) {
        expect(taskForDelivery.length).to.eq(1);//there is also a home-visit task
        
        await harness.loadAction(taskForDelivery[0]);
        const deliveryFormResult = await harness.fillForm(...deliveryReportScenarios.oneChildHealthyFacility);
        expect(deliveryFormResult.errors).to.be.empty;
        const tasksAfterDeliveryReport = await harness.getTasks();
        expect(tasksAfterDeliveryReport).to.be.empty;
        resolved = true;
      }

      else {
        expect(taskForDelivery).to.be.an('array').that.does.not.contain.something.like({ title: 'task.anc.delivery.title' });
      }
    }
  });
});
