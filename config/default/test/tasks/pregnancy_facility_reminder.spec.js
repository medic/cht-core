const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-like'));
chai.use(require('chai-things'));
const path = require('path');
const TestRunner = require('medic-conf-test-harness');
const { pregnancyRegistrationScenarios, pregnancyHomeVisitScenarios } = require('../form-inputs');
const { getRangeForTask, getTaskTestDays } = require('../test-helpers');
const harness = new TestRunner({
  xformFolderPath: path.join(__dirname, '../../forms/app'),
});

const now = '2000-01-01';
const facilityReminderTask = {
  pre: 3,
  post: 7,
  triggers: [14],//2000-01-15, pregnancyRegistrationScenarios.safe
  triggerUnit: 'days'
};

const facilityReminderTaskDays = getRangeForTask(facilityReminderTask);
describe('Pregnancy registration and scheduled visit', () => {
  before(async () => {
    return await harness.start();
  });
  after(async () => {
    return await harness.stop();
  });
  beforeEach(async () => {
    await harness.clear();
    await harness.setNow(now);
    return await harness.loadForm('pregnancy');
  });
  afterEach(() => { expect(harness.consoleErrors).to.be.empty; });

  it('pregnancy registration and scheduled visit', async () => {
    const actionFormResult = await harness.fillForm(...pregnancyRegistrationScenarios.safe);
    expect(actionFormResult.errors).to.be.empty;
    for (const day of getTaskTestDays(0, 30, facilityReminderTask, 3)) {
      await harness.setNow(now);
      await harness.flush(day);
      if (facilityReminderTaskDays.includes(day)) {
        const taskForFollowUpReminder = await harness.getTasks();
        expect(taskForFollowUpReminder).to.be.an('array').that.contains.something.like({ title: 'task.anc.facility_reminder.title' });
      }

      else {
        const tasks = await harness.getTasks();
        expect(tasks).to.be.an('array').that.does.not.contain.something.like({ title: 'task.anc.facility_reminder.title' });
      }
    }

  });

  it('facility reminder task is resolved', async () => {
    const actionFormResult = await harness.fillForm(...pregnancyRegistrationScenarios.safe);
    expect(actionFormResult.errors).to.be.empty;
    let resolved = false;
    for (const day of getTaskTestDays(0, 30, facilityReminderTask, 3)) {
      await harness.setNow(now);
      await harness.flush(day);
      if (facilityReminderTaskDays.includes(day) && resolved === false) {
        const taskForFollowUpReminder = await harness.getTasks();
        expect(taskForFollowUpReminder).to.be.an('array').that.contains.something.like({ title: 'task.anc.facility_reminder.title' });

        await harness.loadAction(taskForFollowUpReminder[0].actions[0]);
        const followupFormResult = await harness.fillForm(['in_person']);
        expect(followupFormResult.errors).to.be.empty;
        const tasksAfterFacilityReminder = await harness.getTasks();
        expect(tasksAfterFacilityReminder).to.be.an('array').that.does.not.contain.something.like({ title: 'task.anc.facility_reminder.title' });
        resolved = true;

      }

      else {
        const tasks = await harness.getTasks();
        expect(tasks).to.be.an('array').that.does.not.contain.something.like({ title: 'task.anc.facility_reminder.title' });
      }
    }

  });

  it('facility reminder task is cleared', async () => {
    const actionFormResult = await harness.fillForm(...pregnancyRegistrationScenarios.safe);
    expect(actionFormResult.errors).to.be.empty;
    let cleared = false;
    for (const day of getTaskTestDays(0, 30, facilityReminderTask, 3)) {
      await harness.setNow(now);
      await harness.flush(day);
      if (facilityReminderTaskDays.includes(day) && cleared === false) {
        const taskForFacilityReminder = await harness.getTasks();
        expect(taskForFacilityReminder).to.be.an('array').that.contains.something.like({ title: 'task.anc.facility_reminder.title' });

        await harness.loadForm('pregnancy_home_visit');
        const followupFormResult = await harness.fillForm(...pregnancyHomeVisitScenarios.clearAll);
        expect(followupFormResult.errors).to.be.empty;
        const tasksAfterFacilityReminder = await harness.getTasks();
        expect(tasksAfterFacilityReminder).to.be.empty;
        cleared = true;
      }

      else {
        const tasks = await harness.getTasks();
        expect(tasks).to.be.an('array').that.does.not.contain.something.like({ title: 'task.anc.facility_reminder.title' });
      }
    }

  });

});
