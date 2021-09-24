const { expect } = require('chai');
const TestRunner = require('cht-conf-test-harness');
const { pregnancyRegistrationScenarios, pregnancyHomeVisitScenarios } = require('../../form-inputs');
const harness = new TestRunner();

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
  });

  it('pregnancy home visit, risks', async () => {
    // Load the pregnancy form and fill in
    await harness.setNow('1999-10-10');
    const pregnancy = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.safe10Weeks);
    expect(pregnancy.errors).to.be.empty;

    await harness.setNow('1999-10-17');
    const taskForHomeVisit = await harness.getTasks({ title: 'task.anc.pregnancy_home_visit.title' });
    expect(taskForHomeVisit.length).to.equal(1);

    await harness.loadAction(taskForHomeVisit[0]);
    const followupFormResult = await harness.fillForm(...pregnancyHomeVisitScenarios.riskDangerMultipleVisits);

    expect(followupFormResult.errors).to.be.empty;

    // Verify some attributes on the resulting report
    expect(followupFormResult.report.fields.data).to.deep.include({
      __activity_to_report: 'home_visit',
      __gestational_age_correct: 'yes',
      __miscarriage_date: '',
      __abortion_date: '',
      __visit_task_clear_option: '',
      __gestational_age_update_method: '',
      __gestational_age_update_weeks: '',
      __gestational_age_update_edd: '',
      __lmp_updated: 'no',
      __lmp_date_new: '',
      __edd_new: '',
      __last_visit_attended: '',
      __report_additional_anc_hf_visits: 'yes',
      __num_additional_anc_hf_visits: '2',
      __additional_anc_hf_visit_dates: '1999-10-02,1999-10-05',
      __has_risk_factors_not_previously_reported: 'yes',
      __heart_condition: 'no',
      __asthma: 'yes',
      __high_blood_pressure: 'no',
      __diabetes: 'yes',
      __additional_high_risk_condition_to_report: 'yes',
      __additional_high_risk_condition: 'underweight',
      __next_anc_hf_visit_date_known: 'yes',
      __next_anc_hf_visit_date: '1999-11-01',
      __vaginal_bleeding: 'no',
      __fits: 'yes',
      __severe_abdominal_pain: 'no',
      __severe_headache: 'no',
      __very_pale: 'no',
      __fever: 'yes',
      __reduced_or_no_fetal_movements: 'no',
      __breaking_water: 'no',
      __easily_tired: 'no',
      __face_hand_swelling: 'no',
      __breathlessness: 'no',
      __has_danger_sign: 'yes',
      __uses_llin: 'yes',
      __takes_iron_folate_daily: 'yes',
      __received_deworming_meds: '',
      __tested_for_hiv_in_past_3_months: 'yes',
      __received_tetanus_toxoid_this_pregnancy: 'yes',
      meta: {
        __patient_uuid: 'patient_id',
        __patient_id: 'patient_id',
        __household_uuid: 'patient_parent_id',
        __source: 'task',
        __source_id: pregnancy.report._id,
        __pregnancy_uuid: pregnancy.report._id,
      }
    });
  });

  it('early end to pregnancy (miscarriage)', async () => {
    await harness.setNow('2000-01-01');

    // Load the pregnancy form and fill in
    const pregnancy = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.riskDanger);
    expect(pregnancy.errors).to.be.empty;

    await harness.flush(2);
    //Load the delivery form and fill in
    const pregnancyVisit = await harness.fillForm('pregnancy_home_visit', ...pregnancyHomeVisitScenarios.miscarriage);
    expect(pregnancyVisit.errors).to.be.empty;

    expect(pregnancyVisit.report.fields.data).to.deep.include({
      __activity_to_report: 'miscarriage',
      __gestational_age_correct: '',
      __miscarriage_date: '2000-01-02',
      __abortion_date: '',
      __visit_task_clear_option: '',
      __gestational_age_update_method: '',
      __gestational_age_update_weeks: '',
      __gestational_age_update_edd: '',
      __lmp_updated: 'no',
      __lmp_date_new: '',
      __edd_new: '',
      __last_visit_attended: '',
      __report_additional_anc_hf_visits: '',
      __num_additional_anc_hf_visits: '',
      __additional_anc_hf_visit_dates: '',
      __has_risk_factors_not_previously_reported: '',
      __heart_condition: '',
      __asthma: '',
      __high_blood_pressure: '',
      __diabetes: '',
      __additional_high_risk_condition_to_report: '',
      __additional_high_risk_condition: '',
      __next_anc_hf_visit_date_known: '',
      __next_anc_hf_visit_date: '',
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
      __has_danger_sign: '',
      __uses_llin: '',
      __takes_iron_folate_daily: '',
      __received_deworming_meds: '',
      __tested_for_hiv_in_past_3_months: '',
      __received_tetanus_toxoid_this_pregnancy: '',
      meta: {
        __patient_uuid: 'patient_id',
        __patient_id: 'patient_id',
        __household_uuid: 'patient_parent_id',
        __source: 'action',
        __source_id: '',
        __pregnancy_uuid: pregnancy.report._id,
      }
    });

  });

  it('early end to pregnancy (abortion)', async () => {
    await harness.setNow('2000-01-01');

    // Load the pregnancy form and fill in
    const pregnancy = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.riskDanger);
    expect(pregnancy.errors).to.be.empty;

    await harness.setNow('2000-01-03');
    //Load the delivery form and fill in
    const pregnancyVisit = await harness.fillForm('pregnancy_home_visit', ...pregnancyHomeVisitScenarios.abortion);
    expect(pregnancyVisit.errors).to.be.empty;

    expect(pregnancyVisit.report.fields.data).to.deep.include({
      __activity_to_report: 'abortion',
      __gestational_age_correct: '',
      __miscarriage_date: '',
      __abortion_date: '2000-01-02',
      __visit_task_clear_option: '',
      __gestational_age_update_method: '',
      __gestational_age_update_weeks: '',
      __gestational_age_update_edd: '',
      __lmp_updated: 'no',
      __lmp_date_new: '',
      __edd_new: '',
      __last_visit_attended: '',
      __report_additional_anc_hf_visits: '',
      __num_additional_anc_hf_visits: '',
      __additional_anc_hf_visit_dates: '',
      __has_risk_factors_not_previously_reported: '',
      __heart_condition: '',
      __asthma: '',
      __high_blood_pressure: '',
      __diabetes: '',
      __additional_high_risk_condition_to_report: '',
      __additional_high_risk_condition: '',
      __next_anc_hf_visit_date_known: '',
      __next_anc_hf_visit_date: '',
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
      __has_danger_sign: '',
      __uses_llin: '',
      __takes_iron_folate_daily: '',
      __received_deworming_meds: '',
      __tested_for_hiv_in_past_3_months: '',
      __received_tetanus_toxoid_this_pregnancy: '',
      meta: {
        __patient_uuid: 'patient_id',
        __patient_id: 'patient_id',
        __household_uuid: 'patient_parent_id',
        __source: 'action',
        __source_id: '',
        __pregnancy_uuid: pregnancy.report._id,
      }
    });

  });


});
