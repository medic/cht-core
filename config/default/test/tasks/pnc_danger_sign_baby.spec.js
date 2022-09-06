const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-like'));
chai.use(require('chai-things'));

//const { Forms } = require('../../nools-extras');
const TestRunner = require('cht-conf-test-harness');

const { pncDangerSignFollowUpScenarios } = require('../form-inputs');
const { newbornBaby } = require('../contacts');
const harness = new TestRunner({
  subject: newbornBaby,
});
const now = '2000-05-01';

describe('PNC danger sign follow up for baby tests', () => {
  before(async () => { return await harness.start(); });
  after(async () => { return await harness.stop(); });
  beforeEach(async () => {
    await harness.clear();
    await harness.setNow(now);
    //clock = sinon.useFakeTimers(moment('1999-10-10').add(day, 'days').toDate());
    //await harness.flush(1);
    return await harness.loadForm('pnc_danger_sign_follow_up_baby');
  });
  afterEach(() => { expect(harness.consoleErrors).to.be.empty; });

  it('PNC danger sign follow up for baby from profile', async () => {

    // Confirm a task appears immediately
    const tasksFromContact = await harness.getTasks({ title: 'task.pnc.danger_sign_followup_baby.title' });
    expect(tasksFromContact).to.have.property('length', 1); //also follow up

    // Complete the task and confirm the task disappears 
    await harness.flush(1);
    await harness.loadAction(tasksFromContact[0]);
    const followupFormResult = await harness.fillForm(...pncDangerSignFollowUpScenarios.baby.cured);
    expect(followupFormResult.errors).to.be.empty;
    expect(followupFormResult.report.fields.data.meta.__delivery_uuid).to.equal(newbornBaby.created_by_doc);
    const tasksAfterDangerSignsFollowUp = await harness.getTasks({ title: 'task.pnc.danger_sign_followup_baby.title' });
    expect(tasksAfterDangerSignsFollowUp).to.have.property('length', 0);

  });

  it('PNC danger sign follow up from PNC danger sign follow up', async () => {

    const tasksFromContact = await harness.getTasks({ title: 'task.pnc.danger_sign_followup_baby.title' });
    expect(tasksFromContact).to.have.property('length', 1);

    await harness.flush(1);
    // Complete the task and confirm the task disappears 

    await harness.loadAction(tasksFromContact[0]);
    let followupFormResult = await harness.fillForm(...pncDangerSignFollowUpScenarios.baby.danger);
    expect(followupFormResult.report.fields.data.meta.__delivery_uuid).to.equal(newbornBaby.created_by_doc);
    const tasksAfterDangerSignFollowUp = await harness.getTasks({ title: 'task.pnc.danger_sign_followup_baby.title' });

    expect(tasksAfterDangerSignFollowUp).to.have.property('length', 1);
    await harness.flush(1);
    await harness.loadAction(tasksAfterDangerSignFollowUp[0]);
    followupFormResult = await harness.fillForm(...pncDangerSignFollowUpScenarios.baby.cured);
    expect(followupFormResult.errors).to.be.empty;
    expect(followupFormResult.report.fields.data.meta.__delivery_uuid).to.equal(newbornBaby.created_by_doc);
    const tasksAfterDangerSignsFollowUp = await harness.getTasks({ title: 'task.pnc.danger_sign_followup_baby.title' });
    expect(tasksAfterDangerSignsFollowUp).to.have.property('length', 0);

  });
});
