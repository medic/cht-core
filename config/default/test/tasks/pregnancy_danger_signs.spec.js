const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-like'));
chai.use(require('chai-things'));
//const { Forms } = require('../../nools-extras');
const TestRunner = require('medic-conf-test-harness');

const { pregnancyRegistrationScenarios, pregnancyDangerSignScenarios, pregnancyHomeVisitScenarios } = require('../form-inputs');
const harness = new TestRunner();

const now = '2000-01-01';

describe('Pregnancy danger sign tests', () => {
  before(async () => { return await harness.start(); });
  after(async () => { return await harness.stop(); });
  beforeEach(async () => {
    await harness.clear();
    await harness.setNow(now);
    //await harness.flush(1);
    return await harness.loadForm('pregnancy');
  });
  afterEach(() => {
    expect(harness.consoleErrors).to.be.empty;
  });

  it('danger sign follow up from pregnancy registration', async () => {
    const actionFormResult = await harness.fillForm(...pregnancyRegistrationScenarios.danger);
    expect(actionFormResult.errors).to.be.empty;

    // Confirm a task appears immediately
    await harness.flush(1);
    const tasksAfterRegistration = await harness.getTasks({ title: 'task.anc.pregnancy_danger_sign_followup.title' });
    expect(tasksAfterRegistration).to.have.property('length', 1);

    // Complete the task and confirm the task disappears 
    await harness.flush(1);
    await harness.loadAction(tasksAfterRegistration[0]);
    const followupFormResult = await harness.fillForm(...pregnancyDangerSignScenarios.followUp.cured);
    expect(followupFormResult.errors).to.be.empty;
    const tasksAfterDangerSignsFollowUp = await harness.getTasks();
    expect(tasksAfterDangerSignsFollowUp).to.have.property('length', 0);

  });
  it('danger sign follow up from pregnancy home visit', async () => {
    const actionFormResult = await harness.fillForm(...pregnancyRegistrationScenarios.safe);
    expect(actionFormResult.errors).to.be.empty;

    await harness.setNow('2000-01-23');
    const taskForHomeVisit = await harness.getTasks({ title: 'task.anc.pregnancy_home_visit.title' });
    expect(taskForHomeVisit.length).to.be.equal(1);

    await harness.flush(1);
    await harness.loadAction(taskForHomeVisit[0]);
    let followupFormResult = await harness.fillForm(...pregnancyHomeVisitScenarios.danger);

    expect(followupFormResult.errors).to.be.empty;
    // Confirm a task appears immediately
    const tasksAfterRegistration = await harness.getTasks({ title: 'task.anc.pregnancy_danger_sign_followup.title' });
    expect(tasksAfterRegistration).to.have.property('length', 1);

    // Complete the task and confirm the task disappears 

    await harness.flush(1);
    await harness.loadAction(tasksAfterRegistration[0]);
    followupFormResult = await harness.fillForm(...pregnancyDangerSignScenarios.followUp.cured);
    expect(followupFormResult.errors).to.be.empty;
    const tasksAfterDangerSignsFollowUp = await harness.getTasks();
    expect(tasksAfterDangerSignsFollowUp).to.have.property('length', 0);
  });

  it('danger sign follow up from pregnancy danger sign', async () => {
    const actionFormResult = await harness.fillForm(...pregnancyRegistrationScenarios.safe);
    expect(actionFormResult.errors).to.be.empty;

    await harness.loadForm('pregnancy_danger_sign');
    let followupFormResult = await harness.fillForm(...pregnancyDangerSignScenarios.danger);

    expect(followupFormResult.errors).to.be.empty;
    // Confirm a task appears immediately
    const tasksAfterDangerSignReport = await harness.getTasks({ title: 'task.anc.pregnancy_danger_sign_followup.title' });
    expect(tasksAfterDangerSignReport).to.have.property('length', 1);

    // Complete the task and confirm the task disappears 

    await harness.flush(1);
    await harness.loadAction(tasksAfterDangerSignReport[0]);
    followupFormResult = await harness.fillForm(...pregnancyDangerSignScenarios.followUp.cured);
    expect(followupFormResult.errors).to.be.empty;
    const tasksAfterDangerSignsFollowUp = await harness.getTasks({ title: 'task.anc.pregnancy_danger_sign_followup.title' });
    expect(tasksAfterDangerSignsFollowUp).to.be.empty;
  });

  it('danger sign follow up from pregnancy danger sign follow up', async () => {
    const actionFormResult = await harness.fillForm(...pregnancyRegistrationScenarios.safe);
    expect(actionFormResult.errors).to.be.empty;

    await harness.loadForm('pregnancy_danger_sign');
    let followupFormResult = await harness.fillForm(...pregnancyDangerSignScenarios.danger);

    expect(followupFormResult.errors).to.be.empty;
    // Confirm a task appears immediately
    //await harness.flush(1);
    const tasksAfterDangerSignReport = await harness.getTasks({ title: 'task.anc.pregnancy_danger_sign_followup.title' });
    expect(tasksAfterDangerSignReport).to.have.property('length', 1);

    await harness.flush(1);
    // Complete the task and confirm the task disappears 

    await harness.loadAction(tasksAfterDangerSignReport[0]);
    followupFormResult = await harness.fillForm(...pregnancyDangerSignScenarios.followUp.danger);

    const tasksAfterDangerSignFollowUp = await harness.getTasks({ title: 'task.anc.pregnancy_danger_sign_followup.title' });
    expect(tasksAfterDangerSignFollowUp).to.have.property('length', 1);
    
    await harness.flush(1);
    await harness.loadAction(tasksAfterDangerSignReport[0]);
    followupFormResult = await harness.fillForm(...pregnancyDangerSignScenarios.followUp.cured);
    expect(followupFormResult.errors).to.be.empty;
    const tasksAfterDangerSignsFollowUp = await harness.getTasks();
    expect(tasksAfterDangerSignsFollowUp).to.have.property('length', 0);

  });

  it('danger sign follow up should not show if tasks were cleared', async () => {
    const actionFormResult = await harness.fillForm(...pregnancyRegistrationScenarios.danger);
    expect(actionFormResult.errors).to.be.empty;

    // Confirm a task appears immediately
    //await harness.flush(1);
    const tasksAfterRegistration = await harness.getTasks({ title: 'task.anc.pregnancy_danger_sign_followup.title' });
    expect(tasksAfterRegistration).to.have.property('length', 1);


    // Clear task and confirm the task disappears 
    await harness.flush(1);
    await harness.loadForm('pregnancy_home_visit');
    const followupFormResult = await harness.fillForm(...pregnancyHomeVisitScenarios.clearAll);
    expect(followupFormResult.errors).to.be.empty;
    const tasksAfterClearing = await harness.getTasks();
    expect(tasksAfterClearing).to.be.empty;

  });
});
