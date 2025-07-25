const { expect } = require('chai');
const TestRunner = require('cht-conf-test-harness');
const { pregnancyRegistrationScenarios, pregnancyDangerSignScenarios } = require('../../form-inputs');
const harness = new TestRunner();

const now = '2000-01-01';
describe('Pregnancy danger sign form analytic field tests', () => {
  before(async () => { return await harness.start(); });
  after(async () => { return await harness.stop(); });
  beforeEach(async () => {
    await harness.clear();
    await harness.setNow(now);
    return await harness.loadForm('pregnancy');
  });
  afterEach(() => {
    expect(harness.consoleErrors).to.be.empty;
  });

  it('danger sign follow up from pregnancy danger sign', async () => {
    const actionFormResult = await harness.fillForm(...pregnancyRegistrationScenarios.safe);
    expect(actionFormResult.errors).to.be.empty;
    await harness.setNow('2000-01-30');
    await harness.loadForm('pregnancy_danger_sign');
    const dangerSignForm = await harness.fillForm(...pregnancyDangerSignScenarios.danger);
    expect(dangerSignForm.report.fields.data).to.deep.include({
      __vaginal_bleeding: 'yes',
      __fits: 'yes',
      __severe_abdominal_pain: 'yes',
      __severe_headache: 'yes',
      __very_pale: 'yes',
      __fever: 'yes',
      __reduced_or_no_fetal_movements: 'yes',
      __breaking_water: 'yes',
      __easily_tired: 'yes',
      __face_hand_swelling: 'yes',
      __breathlessness: 'yes',
      __has_danger_sign: 'yes',
      meta: {
        __patient_uuid: 'patient_id',
        __patient_id: 'patient_id',
        __household_uuid: 'patient_parent_id',
        __source: 'action',
        __source_id: '',
        __pregnancy_uuid: actionFormResult.report._id
      }
    });
    expect(dangerSignForm.errors).to.be.empty;
    const tasksAfterDangerSignReport = await harness.getTasks({ title: 'task.anc.pregnancy_danger_sign_followup.title' });

    await harness.flush(1);
    await harness.loadAction(tasksAfterDangerSignReport[0]);
    const dangerSignFollowupFormResult = await harness.fillForm(...pregnancyDangerSignScenarios.followUp.cured);
    expect(dangerSignFollowupFormResult.errors).to.be.empty;
    expect(dangerSignFollowupFormResult.report.fields.data).to.deep.include({
      __visited_hf: 'yes',
      __still_experiencing_danger_sign: 'no',
      __vaginal_bleeding: '',
      __fits: '',
      __severe_abdominal_pain: '',
      __severe_headache: '',
      __very_pale: '',
      __fever: '',
      __reduced_or_no_fetal_movements: '',
      __breaking_water: '',
      __easily_tired: '',
      __face_hand_swelling: '',
      __breathlessness: '',
      __has_danger_sign: 'no',
      meta: {
        __patient_uuid: 'patient_id',
        __patient_id: 'patient_id',
        __household_uuid: 'patient_parent_id',
        __source: 'task',
        __source_id: dangerSignForm.report._id,
        __pregnancy_uuid: actionFormResult.report._id
      }
    });
  });
});
