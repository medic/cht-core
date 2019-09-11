const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-like'));
chai.use(require('chai-things'));
const path = require('path');

//const { Forms } = require('../../nools-extras');
const TestRunner = require('medic-conf-test-harness');

const { pncDangerSignFollowUpScenarios } = require('../form-inputs');
const { newbornBaby } = require('../contacts');
const harness = new TestRunner({
  xformFolderPath: path.join(__dirname, '../../forms/app'),
  inputs: { content: { contact: newbornBaby } }
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
    const tasksFromContact = await harness.getTasks();
    expect(tasksFromContact).to.have.property('length', 1); //also follow up
    expect(tasksFromContact).to.be.an('array').that.contains.something.like({ title: 'task.pnc.danger_sign_followup_baby.title' });

    // Complete the task and confirm the task disappears 
    await harness.flush(1);
    await harness.loadAction(tasksFromContact[0].actions[0]);
    const followupFormResult = await harness.fillForm(...pncDangerSignFollowUpScenarios.baby.cured);
    expect(followupFormResult.errors).to.be.empty;
    const tasksAfterDangerSignsFollowUp = await harness.getTasks();
    expect(tasksAfterDangerSignsFollowUp).to.be.an('array').that.does.not.contain.something.like({ title: 'task.pnc.danger_sign_followup_baby.title' });

  });

  it('PNC danger sign follow up from PNC danger sign follow up', async () => {

    const tasksFromContact = await harness.getTasks();
    expect(tasksFromContact).to.have.property('length', 1);
    expect(tasksFromContact).to.be.an('array').that.contains.something.like({ title: 'task.pnc.danger_sign_followup_baby.title' });

    await harness.flush(1);
    // Complete the task and confirm the task disappears 

    await harness.loadAction(tasksFromContact[0].actions[0]);
    let followupFormResult = await harness.fillForm(...pncDangerSignFollowUpScenarios.baby.danger);
    const tasksAfterDangerSignFollowUp = await harness.getTasks();

    expect(tasksAfterDangerSignFollowUp).to.have.property('length', 1);
    expect(tasksAfterDangerSignFollowUp).to.be.an('array').that.contains.something.like({ title: 'task.pnc.danger_sign_followup_baby.title' });
    await harness.flush(1);
    await harness.loadAction(tasksAfterDangerSignFollowUp[0].actions[0]);
    followupFormResult = await harness.fillForm(...pncDangerSignFollowUpScenarios.baby.cured);
    expect(followupFormResult.errors).to.be.empty;
    const tasksAfterDangerSignsFollowUp = await harness.getTasks();
    expect(tasksAfterDangerSignsFollowUp).to.be.an('array').that.does.not.contain.something.like({ title: 'task.pnc.danger_sign_followup_baby.title' });

  });
});
