const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-like'));
chai.use(require('chai-things'));
const path = require('path');
const moment = require('moment');
const sinon = require('sinon');
let clock;
//const { Forms } = require('../../nools-extras');
const TestRunner = require('medic-conf-test-harness');

const { pregnancyRegistrationScenarios, pregnancyDangerSignScenarios, pregnancyHomeVisitScenarios } = require('../form-inputs');
const harness = new TestRunner({
  xformFolderPath: path.join(__dirname, '../../forms/app'),
});

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
    if (clock) {clock.restore();}
  });

  it('danger sign follow up from pregnancy registration', async () => {
    const actionFormResult = await harness.fillForm(...pregnancyRegistrationScenarios.danger);
    expect(actionFormResult.errors).to.be.empty;

    // Confirm a task appears immediately
    await harness.flush(1);
    const tasksAfterRegistration = await harness.getTasks();
    expect(tasksAfterRegistration).to.have.property('length', 1); //also follow up
    expect(tasksAfterRegistration).to.be.an('array').that.contains.something.like({ title: 'task.anc.pregnancy_danger_sign_followup.title' });

    // Complete the task and confirm the task disappears 
    await harness.flush(1);
    await harness.loadAction(tasksAfterRegistration[0].actions[0]);
    const followupFormResult = await harness.fillForm(...pregnancyDangerSignScenarios.followUp.cured);
    expect(followupFormResult.errors).to.be.empty;
    const tasksAfterDangerSignsFollowUp = await harness.getTasks();
    expect(tasksAfterDangerSignsFollowUp).to.be.an('array').that.does.not.contain.something.like({ title: 'task.anc.pregnancy_danger_sign_followup.title' });

  });
  it('danger sign follow up from pregnancy home visit', async () => {
    const actionFormResult = await harness.fillForm(...pregnancyRegistrationScenarios.safe);
    expect(actionFormResult.errors).to.be.empty;

    clock = sinon.useFakeTimers(moment('2000-01-23').toDate());
    const taskForHomeVisit = await harness.getTasks({ now: '2000-01-23', title: 'task.anc.pregnancy_home_visit.title' });
    //expect(taskForHomeVisit.length).to.be.greaterThan(0);
    expect(taskForHomeVisit.length).to.be.equal(1);

    await harness.flush(1);
    await harness.loadForm(taskForHomeVisit[0].actions[0].form);
    let followupFormResult = await harness.fillForm(...pregnancyHomeVisitScenarios.danger);

    expect(followupFormResult.errors).to.be.empty;
    // Confirm a task appears immediately
    const tasksAfterRegistration = await harness.getTasks();
    expect(tasksAfterRegistration).to.have.property('length', 1); //also follow up
    expect(tasksAfterRegistration).to.be.an('array').that.contains.something.like({ title: 'task.anc.pregnancy_danger_sign_followup.title' });

    // Complete the task and confirm the task disappears 

    await harness.flush(1);
    await harness.loadAction(tasksAfterRegistration[0].actions[0]);
    followupFormResult = await harness.fillForm(...pregnancyDangerSignScenarios.followUp.cured);
    expect(followupFormResult.errors).to.be.empty;
    const tasksAfterDangerSignsFollowUp = await harness.getTasks();
    expect(tasksAfterDangerSignsFollowUp).to.be.an('array').that.does.not.contain.something.like({ title: 'task.anc.pregnancy_danger_sign_followup.title' });
  });

  it('danger sign follow up from pregnancy danger sign', async () => {
    const actionFormResult = await harness.fillForm(...pregnancyRegistrationScenarios.safe);
    expect(actionFormResult.errors).to.be.empty;

    await harness.loadForm('pregnancy_danger_sign');
    let followupFormResult = await harness.fillForm(...pregnancyDangerSignScenarios.danger);

    expect(followupFormResult.errors).to.be.empty;
    // Confirm a task appears immediately
    const tasksAfterDangerSignReport = await harness.getTasks();
    expect(tasksAfterDangerSignReport).to.have.property('length', 1);
    expect(tasksAfterDangerSignReport).to.be.an('array').that.contains.something.like({ title: 'task.anc.pregnancy_danger_sign_followup.title' });

    // Complete the task and confirm the task disappears 

    await harness.flush(1);
    await harness.loadAction(tasksAfterDangerSignReport[0].actions[0]);
    followupFormResult = await harness.fillForm(...pregnancyDangerSignScenarios.followUp.cured);
    expect(followupFormResult.errors).to.be.empty;
    const tasksAfterDangerSignsFollowUp = await harness.getTasks();
    expect(tasksAfterDangerSignsFollowUp).to.be.an('array').that.does.not.contain.something.like({ title: 'task.anc.pregnancy_danger_sign_followup.title' });
  });

  it('danger sign follow up from pregnancy danger sign follow up', async () => {
    const actionFormResult = await harness.fillForm(...pregnancyRegistrationScenarios.safe);
    expect(actionFormResult.errors).to.be.empty;

    await harness.loadForm('pregnancy_danger_sign');
    let followupFormResult = await harness.fillForm(...pregnancyDangerSignScenarios.danger);

    expect(followupFormResult.errors).to.be.empty;
    // Confirm a task appears immediately
    //await harness.flush(1);
    const tasksAfterDangerSignReport = await harness.getTasks();
    expect(tasksAfterDangerSignReport).to.have.property('length', 1);
    expect(tasksAfterDangerSignReport).to.be.an('array').that.contains.something.like({ title: 'task.anc.pregnancy_danger_sign_followup.title' });

    await harness.flush(1);
    // Complete the task and confirm the task disappears 

    await harness.loadAction(tasksAfterDangerSignReport[0].actions[0]);
    followupFormResult = await harness.fillForm(...pregnancyDangerSignScenarios.followUp.danger);
    const tasksAfterDangerSignFollowUp = await harness.getTasks();

    expect(tasksAfterDangerSignFollowUp).to.have.property('length', 1);
    expect(tasksAfterDangerSignFollowUp).to.be.an('array').that.contains.something.like({ title: 'task.anc.pregnancy_danger_sign_followup.title' });
    await harness.flush(1);
    await harness.loadAction(tasksAfterDangerSignReport[0].actions[0]);
    followupFormResult = await harness.fillForm(...pregnancyDangerSignScenarios.followUp.cured);
    expect(followupFormResult.errors).to.be.empty;
    const tasksAfterDangerSignsFollowUp = await harness.getTasks();
    expect(tasksAfterDangerSignsFollowUp).to.be.an('array').that.does.not.contain.something.like({ title: 'task.anc.pregnancy_danger_sign_followup.title' });

  });

  it('danger sign follow up should not show if tasks were cleared', async () => {
    const actionFormResult = await harness.fillForm(...pregnancyRegistrationScenarios.danger);
    expect(actionFormResult.errors).to.be.empty;

    // Confirm a task appears immediately
    //await harness.flush(1);
    const tasksAfterRegistration = await harness.getTasks();
    expect(tasksAfterRegistration).to.have.property('length', 1); //also follow up
    expect(tasksAfterRegistration).to.be.an('array').that.contains.something.like({ title: 'task.anc.pregnancy_danger_sign_followup.title' });


    // Clear task and confirm the task disappears 
    await harness.flush(1);
    await harness.loadForm('pregnancy_home_visit');
    const followupFormResult = await harness.fillForm(...pregnancyHomeVisitScenarios.clearAll);
    expect(followupFormResult.errors).to.be.empty;
    const tasksAfterClearing = await harness.getTasks();
    expect(tasksAfterClearing).to.be.empty;

  });
});
