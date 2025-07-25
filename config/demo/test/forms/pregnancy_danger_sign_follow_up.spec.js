const { expect } = require('chai');
const TestRunner = require('cht-conf-test-harness');
const { followUp } = require('../form-inputs').pregnancyDangerSignScenarios;
const harnessDefaults = require('../../harness.defaults.json');

const harness = new TestRunner();
const TODAY = '2000-01-01';
const patientDoc = harnessDefaults.docs.find(doc => doc._id === harnessDefaults.subject);

describe('Pregnancy danger sign follow-up form', () => {
  before(() => harness.start());

  after(() => harness.stop());

  beforeEach(
    async() => {
      await harness.clear();
      await harness.setNow(new Date(TODAY));
    });

  afterEach(() => expect(harness.consoleErrors).to.be.empty);

  it('saves data when a danger sign is recorded', async() => {
    const result = await harness.fillForm('pregnancy_danger_sign_follow_up', ...followUp.danger);

    expect(result.errors).to.be.empty;
    expect(result.report.fields).to.deep.include({
      t_danger_signs_referral_follow_up: 'yes',
      data: {
        __breaking_water: 'no',
        __breathlessness: 'no',
        __easily_tired: 'no',
        __face_hand_swelling: 'no',
        __fever: 'no',
        __fits: 'no',
        __has_danger_sign: 'yes',
        __reduced_or_no_fetal_movements: 'no',
        __severe_abdominal_pain: 'no',
        __severe_headache: 'no',
        __still_experiencing_danger_sign: 'yes',
        __vaginal_bleeding: 'yes',
        __very_pale: 'no',
        __visited_hf: 'yes',
        meta: {
          __household_uuid: patientDoc.parent._id,
          __patient_id: patientDoc._id,
          __patient_uuid: patientDoc._id,
          __pregnancy_uuid: '',
          __source: 'action',
          __source_id: ''
        }
      }
    });
    expect(result.report.fields.danger_signs).to.deep.include({
      r_danger_sign_present: 'yes'
    });
  });

  it('saves data when no danger signs are recorded', async() => {
    const result = await harness.fillForm('pregnancy_danger_sign_follow_up', ...followUp.cured);

    expect(result.errors).to.be.empty;
    expect(result.report.fields).to.deep.include({
      t_danger_signs_referral_follow_up: 'no',
      data: {
        __breaking_water: '',
        __breathlessness: '',
        __easily_tired: '',
        __face_hand_swelling: '',
        __fever: '',
        __fits: '',
        __has_danger_sign: 'no',
        __reduced_or_no_fetal_movements: '',
        __severe_abdominal_pain: '',
        __severe_headache: '',
        __still_experiencing_danger_sign: 'no',
        __vaginal_bleeding: '',
        __very_pale: '',
        __visited_hf: 'yes',
        meta: {
          __household_uuid: patientDoc.parent._id,
          __patient_id: patientDoc._id,
          __patient_uuid: patientDoc._id,
          __pregnancy_uuid: '',
          __source: 'action',
          __source_id: ''
        }
      }
    });
    expect(result.report.fields.danger_signs).to.deep.include({
      r_danger_sign_present: 'no'
    });
  });
});
