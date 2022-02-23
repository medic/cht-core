const chai = require('chai');
const expect = chai.expect;
const TestRunner = require('medic-conf-test-harness');
const { MAX_DAYS_IN_PREGNANCY, getRangeForTask, getTaskTestDays } = require('../test-helpers');
const { pregnancyRegistrationScenarios, pregnancyHomeVisitScenarios } = require('../form-inputs');
const harness = new TestRunner();
const TEST_INTERVAL_DAYS = 7;

describe('pregnancy home visit tests', () => {
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
  });

  //ANC Home Visit: 12, 20, 26, 30, 34, 36, 38, 40 weeks (Known LMP)
  //show from 7 days before due date, show until 14 days after due date
  //Register date: 1999-10-10
  //LMP: 1999-08-01
  //LMP+12 weeks: 1999-10-24 (From: 1999-10-17, To: 1999-11-07)
  //LMP+20 weeks: 1999-12-19 (From: 1999-12-12, To: 2000-01-02)

  const pregnancyHomeVisitTaskFirst = {
    pre: 7,
    post: 14,
    triggers: [12, 20, 26, 30],
    triggerUnit: 'weeks'
  };

  const pregnancyHomeVisitTaskSecond = {
    pre: 6,
    post: 7,
    triggers: [34, 36, 38, 40],
    triggerUnit: 'weeks'
  };

  const pregnancyHomeVisitUnknownLMPTask = {
    pre: 6,
    post: 7,
    triggers: Array(21).fill().map((item, index) => (1 + index) * 2), //[2, 4, 6, ..., 40, 42]
    triggerUnit: 'weeks'
  };

  const pregnancyHomeVisitTaskDays = getRangeForTask(pregnancyHomeVisitTaskFirst).concat(getRangeForTask(pregnancyHomeVisitTaskSecond));

  const pregnancyHomeVisitUnknownLMPTaskDays = getRangeForTask(pregnancyHomeVisitUnknownLMPTask);

  it('pregnancy home visit task should show', async () => {
    await harness.setNow('1999-10-10');//10 weeks after LMP date
    const pregnancy = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.safe10Weeks);
    expect(pregnancy.errors).to.be.empty;

    const daysToTest = getTaskTestDays(70, 32 * 7, pregnancyHomeVisitTaskFirst, TEST_INTERVAL_DAYS)
      .concat(getTaskTestDays(32 * 7 + 1, MAX_DAYS_IN_PREGNANCY, pregnancyHomeVisitTaskSecond, TEST_INTERVAL_DAYS));
    for (const day of daysToTest) {
      
      await harness.setNow('1999-08-01');//10 weeks after LMP date
      await harness.flush(day);
      const taskForHomeVisit = await harness.getTasks({ title: 'task.anc.pregnancy_home_visit.title' });
      if (pregnancyHomeVisitTaskDays.includes(day)) {
        expect(taskForHomeVisit.length).to.equal(1, day);
      }

      else {
        expect(taskForHomeVisit).to.be.empty;
      }
    }
  });

  it('pregnancy home visit task should resolve after submitting the form', async () => {
    await harness.setNow('1999-10-10');
    const pregnancy = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.safe10Weeks);
    expect(pregnancy.errors).to.be.empty;

    await harness.setNow('1999-10-17');
    let taskForHomeVisit = await harness.getTasks({ title: 'task.anc.pregnancy_home_visit.title' });
    expect(taskForHomeVisit.length).to.equal(1);

    const followupFormResult = await harness.loadAction(taskForHomeVisit[0], ...pregnancyHomeVisitScenarios.safeNoFacilityVisits);

    expect(followupFormResult.errors).to.be.empty;

    //Task should clear
    expect(await harness.getTasks()).to.be.empty;
    
    await harness.setNow('1999-12-12');
    taskForHomeVisit = await harness.getTasks({ title: 'task.anc.pregnancy_home_visit.title' });
    expect(taskForHomeVisit.length).to.equal(1);
  });


  it('pregnancy home visit task for unknown LMP', async () => {
    await harness.setNow('2000-01-01');//Registration Date
    const pregnancy = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.lmpUnknown);
    expect(pregnancy.errors).to.be.empty;
    for (const day of getTaskTestDays(0, MAX_DAYS_IN_PREGNANCY, pregnancyHomeVisitUnknownLMPTask, TEST_INTERVAL_DAYS)) {
      await harness.setNow('2000-01-01');//Registration Date
      await harness.flush(day);

      const taskForHomeVisit = await harness.getTasks({ title: 'task.anc.pregnancy_home_visit.title' });
      if (pregnancyHomeVisitUnknownLMPTaskDays.includes(day)) {
        expect(taskForHomeVisit).to.have.property('length', 1, day);
      }
      else {
        expect(taskForHomeVisit, day).to.be.empty;
      }
    }
  });


  it('pregnancy home visit task should resolve after all tasks cleared', async () => {
    await harness.setNow('1999-10-10');//10 weeks after LMP date
    const pregnancy = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.safe10Weeks);
    expect(pregnancy.errors).to.be.empty;
    let cleared = false;
    for (const day of getTaskTestDays(70, 32 * 7, pregnancyHomeVisitTaskFirst, TEST_INTERVAL_DAYS).concat(getTaskTestDays(32 * 7 + 1, MAX_DAYS_IN_PREGNANCY, pregnancyHomeVisitTaskSecond, TEST_INTERVAL_DAYS))) {
      await harness.setNow('1999-08-01');//10 weeks after LMP date
      await harness.flush(day);
      
      if (pregnancyHomeVisitTaskDays.includes(day) && !cleared) {
        const taskForHomeVisit = await harness.getTasks({ title: 'task.anc.pregnancy_home_visit.title' });
        expect(taskForHomeVisit).to.have.property('length', 1, day);

        const followupFormResult = await harness.loadAction(taskForHomeVisit[0], ...pregnancyHomeVisitScenarios.clearAll);

        expect(followupFormResult.errors).to.be.empty;
        cleared = true;
      }

      else {
        expect(await harness.getTasks()).to.be.empty;
      }
    }

  });

  it('pregnancy home visit task with unknown LMP should resolve after all tasks cleared', async () => {
    await harness.setNow('2000-01-01');
    const pregnancy = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.lmpUnknown);
    expect(pregnancy.errors).to.be.empty;
    let cleared = false;
    for (const day of getTaskTestDays(0, MAX_DAYS_IN_PREGNANCY, pregnancyHomeVisitUnknownLMPTask, TEST_INTERVAL_DAYS)) {
      await harness.setNow('2000-01-01');
      await harness.flush(day);
      
      if (pregnancyHomeVisitUnknownLMPTaskDays.includes(day) && !cleared) {
        const taskForHomeVisit = await harness.getTasks({ title: 'task.anc.pregnancy_home_visit.title' });
        expect(taskForHomeVisit).to.have.property('length', 1, day);

        const followupFormResult = await harness.loadAction(taskForHomeVisit[0], ...pregnancyHomeVisitScenarios.clearAll);

        expect(followupFormResult.errors).to.be.empty;
        cleared = true;
      }

      else {
        expect(await harness.getTasks()).to.be.empty;
      }
    }
  });

});
