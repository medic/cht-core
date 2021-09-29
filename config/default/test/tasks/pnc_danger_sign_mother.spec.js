const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-like'));
chai.use(require('chai-things'));

//const { Forms } = require('../../nools-extras');
const TestRunner = require('medic-conf-test-harness');

const { deliveryReportScenarios, pncDangerSignFollowUpScenarios, pregnancyHomeVisitScenarios } = require('../form-inputs');
const harness = new TestRunner();

const now = '2000-04-30';

describe('PNC danger sign follow up for mother tests', () => {
  before(async () => { return await harness.start(); });
  after(async () => { return await harness.stop(); });
  beforeEach(async () => {
    await harness.clear();
    await harness.setNow(now);
    //clock = sinon.useFakeTimers(moment('1999-10-10').add(day, 'days').toDate());
    //await harness.flush(1);
    return await harness.loadForm('delivery');
  });
  afterEach(() => { expect(harness.consoleErrors).to.be.empty; });

  it('PNC danger sign follow up for mother from delivery', async () => {
    const actionFormResult = await harness.fillForm(...deliveryReportScenarios.motherDangerSign);
    expect(actionFormResult.errors).to.be.empty;

    // Confirm a task appears immediately
    await harness.flush(1);
    const tasksAfterDelivery = await harness.getTasks({ title: 'task.pnc.danger_sign_followup_mother.title' });
    expect(tasksAfterDelivery).to.have.property('length', 1); //also follow up

    // Complete the task and confirm the task disappears 
    await harness.flush(1);
    await harness.loadAction(tasksAfterDelivery[0]);
    const followupFormResult = await harness.fillForm(...pncDangerSignFollowUpScenarios.mother.cured);
    expect(followupFormResult.errors).to.be.empty;
    const tasksAfterDangerSignsFollowUp = await harness.getTasks();
    expect(tasksAfterDangerSignsFollowUp).to.have.property('length', 0); //also follow up

  });

  it('PNC danger sign follow up from PNC danger sign follow up', async () => {
    const actionFormResult = await harness.fillForm(...deliveryReportScenarios.motherDangerSign);
    expect(actionFormResult.errors).to.be.empty;
    // Confirm a task appears immediately
    //await harness.flush(1);
    const tasksAfterDangerSignFollowUp = await harness.getTasks({ title: 'task.pnc.danger_sign_followup_mother.title' });
    expect(tasksAfterDangerSignFollowUp).to.have.property('length', 1);

    await harness.flush(1);
    // Complete the task and confirm the task disappears 

    await harness.loadAction(tasksAfterDangerSignFollowUp[0]);
    let followupFormResult = await harness.fillForm(...pncDangerSignFollowUpScenarios.mother.danger);
    
    const tasksAfterDangerSignFollowUp2 = await harness.getTasks({ title: 'task.pnc.danger_sign_followup_mother.title' });
    expect(tasksAfterDangerSignFollowUp2).to.have.property('length', 1);

    await harness.flush(1);
    await harness.loadAction(tasksAfterDangerSignFollowUp2[0]);
    followupFormResult = await harness.fillForm(...pncDangerSignFollowUpScenarios.mother.cured);
    expect(followupFormResult.errors).to.be.empty;
    const tasksAfterDangerSignFollowUp3 = await harness.getTasks();
    expect(tasksAfterDangerSignFollowUp3).to.have.property('length', 0);

  });
  
  it('PNC danger sign follow up should not show if tasks were cleared', async () => {
    const actionFormResult = await harness.fillForm(...deliveryReportScenarios.motherDangerSign);
    expect(actionFormResult.errors).to.be.empty;

    // Confirm a task appears immediately
    //await harness.flush(1);
    const tasksAfterDelivery = await harness.getTasks({ title: 'task.pnc.danger_sign_followup_mother.title' });
    expect(tasksAfterDelivery).to.have.property('length', 1); //also follow up


    // Clear task and confirm the task disappears 
    await harness.flush(1);
    await harness.loadForm('pregnancy_home_visit');
    const followupFormResult = await harness.fillForm(...pregnancyHomeVisitScenarios.clearAll);
    expect(followupFormResult.errors).to.be.empty;
    const tasksAfterClearing = await harness.getTasks();
    expect(tasksAfterClearing).to.be.empty;

  });
});
