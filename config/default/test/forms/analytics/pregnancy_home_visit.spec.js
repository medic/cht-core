const { expect } = require('chai');
const TestRunner = require('medic-conf-test-harness');
const path = require('path');
const moment = require('moment');
const sinon = require('sinon');
const { pregnancyRegistrationScenarios, pregnancyHomeVisitScenarios } = require('../../form-inputs');
const harness = new TestRunner({
  xformFolderPath: path.join(__dirname, '../../../forms/app'),
});

let clock;
describe('Pregnancy home visit form analytic field tests', () => {
  before(async () => { return await harness.start(); });
  after(async () => { return await harness.stop(); });
  beforeEach(
    async () => {
      await harness.clear();
      await harness.setNow(new Date('2000-01-01'));//UTC 00:00
      return harness.loadForm('pregnancy');
    });
  afterEach(() => {
    expect(harness.consoleErrors).to.be.empty;
    if(clock) {clock.restore();}
  });

  it('pregnancy home visit, risks', async () => {
    // Load the pregnancy form and fill in
    await harness.setNow('1999-10-10');
    const pregnancy = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.safe10Weeks);
    expect(pregnancy.errors).to.be.empty;

    clock = sinon.useFakeTimers(moment('1999-10-17').toDate());
    let taskForHomeVisit = await harness.getTasks({ now: '1999-10-17', title: 'task.anc.pregnancy_home_visit.title' });
    expect(taskForHomeVisit.length).to.equal(1);

    await harness.loadForm(taskForHomeVisit[0].actions[0].form);
    const followupFormResult = await harness.fillForm(...pregnancyHomeVisitScenarios.riskDangerMultipleVisits);

    expect(followupFormResult.errors).to.be.empty;

    // Verify some attributes on the resulting report
    expect(followupFormResult.report.fields.data).to.deep.include({
      o_activity_to_report: 'home_visit',
      o_gestational_age_correct: 'yes',
      o_miscarriage_date: '',
      o_abortion_date: '',
      o_visit_task_clear_option: '',
      o_gestational_age_update_method: '',
      o_gestational_age_update_weeks: '',
      o_gestational_age_update_edd: '',
      o_lmp_updated: 'no',
      o_lmp_date_new: '',
      o_edd_new: '',
      o_last_visit_attended: '',
      o_report_additional_anc_hf_visits: 'yes',
      o_num_additional_anc_hf_visits: '2',
      o_additional_anc_hf_visit_dates: '1999-10-02,1999-10-05',
      o_has_risk_factors_not_previously_reported: 'yes',
      o_heart_condition: 'no',
      o_asthma: 'yes',
      o_high_blood_pressure: 'no',
      o_diabetes: 'yes',
      o_additional_high_risk_condition_to_report: 'yes',
      o_additional_high_risk_condition: 'underweight',
      o_next_anc_hf_visit_date_known: 'yes',
      o_next_anc_hf_visit_date: '1999-11-01',
      o_vaginal_bleeding: 'no',
      o_fits: 'yes',
      o_severe_abdominal_pain: 'no',
      o_severe_headache: 'no',
      o_very_pale: 'no',
      o_fever: 'yes',
      o_reduced_or_no_foetal_movements: 'no',
      o_breaking_water: 'no',
      o_easily_tired: 'no',
      o_face_hand_swelling: 'no',
      o_breathlessness: 'no',
      o_has_danger_sign: 'yes',
      o_uses_llin: 'yes',
      o_takes_iron_folate_daily: 'yes',
      o_received_deworming_meds: '',
      o_tested_for_hiv_in_past_3_months: 'yes',
      o_received_tetanus_toxoid_this_pregnancy: 'yes',
      m_patient_uuid: 'patient_id',
      m_patient_id: 'patient_id',
      m_household_uuid: 'patient_parent_id',
      m_source: 'action',
      m_source_id: '',
      m_pregnancy_uuid: '1'
    });
  });

  it('early end to pregnancy (miscarriage)', async () => {
    await harness.setNow('2000-01-01');

    clock = sinon.useFakeTimers(moment('2000-01-01').toDate());
    // Load the pregnancy form and fill in
    let result = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.riskDanger);
    expect(result.errors).to.be.empty;

    harness.setNow('2000-01-03');
    clock = sinon.useFakeTimers(moment('2000-01-03').toDate());
    //Load the delivery form and fill in
    result = await harness.fillForm('pregnancy_home_visit', ...pregnancyHomeVisitScenarios.miscarriage);
    expect(result.errors).to.be.empty;

    expect(result.report.fields.data).to.deep.include({
      o_activity_to_report: 'miscarriage',
      o_gestational_age_correct: '',
      o_miscarriage_date: '2000-01-02',
      o_abortion_date: '',
      o_visit_task_clear_option: '',
      o_gestational_age_update_method: '',
      o_gestational_age_update_weeks: '',
      o_gestational_age_update_edd: '',
      o_lmp_updated: 'no',
      o_lmp_date_new: '',
      o_edd_new: '',
      o_last_visit_attended: '',
      o_report_additional_anc_hf_visits: '',
      o_num_additional_anc_hf_visits: '',
      o_additional_anc_hf_visit_dates: '',
      o_has_risk_factors_not_previously_reported: '',
      o_heart_condition: '',
      o_asthma: '',
      o_high_blood_pressure: '',
      o_diabetes: '',
      o_additional_high_risk_condition_to_report: '',
      o_additional_high_risk_condition: '',
      o_next_anc_hf_visit_date_known: '',
      o_next_anc_hf_visit_date: '',
      o_vaginal_bleeding: '',
      o_fits: '',
      o_severe_abdominal_pain: '',
      o_severe_headache: '',
      o_very_pale: '',
      o_fever: '',
      o_reduced_or_no_foetal_movements: '',
      o_breaking_water: '',
      o_easily_tired: '',
      o_face_hand_swelling: '',
      o_breathlessness: '',
      o_has_danger_sign: '',
      o_uses_llin: '',
      o_takes_iron_folate_daily: '',
      o_received_deworming_meds: '',
      o_tested_for_hiv_in_past_3_months: '',
      o_received_tetanus_toxoid_this_pregnancy: '',
      m_patient_uuid: 'patient_id',
      m_patient_id: 'patient_id',
      m_household_uuid: 'patient_parent_id',
      m_source: 'action',
      m_source_id: '',
      m_pregnancy_uuid: '1'
    });

  });

  it('early end to pregnancy (abortion)', async () => {
    await harness.setNow('2000-01-01');

    clock = sinon.useFakeTimers(moment('2000-01-01').toDate());
    // Load the pregnancy form and fill in
    let result = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.riskDanger);
    expect(result.errors).to.be.empty;

    harness.setNow('2000-01-03');
    clock = sinon.useFakeTimers(moment('2000-01-03').toDate());
    //Load the delivery form and fill in
    result = await harness.fillForm('pregnancy_home_visit', ...pregnancyHomeVisitScenarios.abortion);
    expect(result.errors).to.be.empty;

    expect(result.report.fields.data).to.deep.include({
      o_activity_to_report: 'abortion',
      o_gestational_age_correct: '',
      o_miscarriage_date: '',
      o_abortion_date: '2000-01-02',
      o_visit_task_clear_option: '',
      o_gestational_age_update_method: '',
      o_gestational_age_update_weeks: '',
      o_gestational_age_update_edd: '',
      o_lmp_updated: 'no',
      o_lmp_date_new: '',
      o_edd_new: '',
      o_last_visit_attended: '',
      o_report_additional_anc_hf_visits: '',
      o_num_additional_anc_hf_visits: '',
      o_additional_anc_hf_visit_dates: '',
      o_has_risk_factors_not_previously_reported: '',
      o_heart_condition: '',
      o_asthma: '',
      o_high_blood_pressure: '',
      o_diabetes: '',
      o_additional_high_risk_condition_to_report: '',
      o_additional_high_risk_condition: '',
      o_next_anc_hf_visit_date_known: '',
      o_next_anc_hf_visit_date: '',
      o_vaginal_bleeding: '',
      o_fits: '',
      o_severe_abdominal_pain: '',
      o_severe_headache: '',
      o_very_pale: '',
      o_fever: '',
      o_reduced_or_no_foetal_movements: '',
      o_breaking_water: '',
      o_easily_tired: '',
      o_face_hand_swelling: '',
      o_breathlessness: '',
      o_has_danger_sign: '',
      o_uses_llin: '',
      o_takes_iron_folate_daily: '',
      o_received_deworming_meds: '',
      o_tested_for_hiv_in_past_3_months: '',
      o_received_tetanus_toxoid_this_pregnancy: '',
      m_patient_uuid: 'patient_id',
      m_patient_id: 'patient_id',
      m_household_uuid: 'patient_parent_id',
      m_source: 'action',
      m_source_id: '',
      m_pregnancy_uuid: '1'
    });

  });


});