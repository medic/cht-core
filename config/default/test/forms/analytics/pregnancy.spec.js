const { expect } = require('chai');
const TestRunner = require('medic-conf-test-harness');
const path = require('path');
const { pregnancyRegistrationScenarios } = require('../../form-inputs');
const harness = new TestRunner({
  xformFolderPath: path.join(__dirname, '../../../forms/app'),
});
describe('Pregnancy form analytic field tests', () => {
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

  it('pregnancy with pregnancy and danger signs followup dates', async () => {
    // Load the pregnancy form and fill in
    const result = await harness.fillForm(...pregnancyRegistrationScenarios.danger);

    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    // Verify some attributes on the resulting report
    expect(result.report.fields.data).to.deep.include({
      o_lmp_method: 'method_lmp',
      o_no_lmp_why_register: '',
      o_lmp_date: '1999-11-01',
      o_lmp_approx_weeks: '',
      o_lmp_approx_months: '',
      o_edd: '2000-08-07',
      o_num_previous_anc_hf_visits: '0',
      o_previous_anc_hf_visit_dates: '',
      o_next_anc_hf_visit_date_known: 'yes',
      o_next_anc_hf_visit_date: '2000-01-20',
      o_has_risk_factors: 'no',
      o_first_pregnancy: 'no',
      o_previous_miscarriage: 'no',
      o_previous_difficulties: 'no',
      o_more_than_4_children: 'no',
      o_last_baby_born_less_than_1_year_ago: 'no',
      o_heart_condition: 'no',
      o_asthma: 'no',
      o_high_blood_pressure: 'no',
      o_diabetes: 'no',
      o_additional_high_risk_condition_to_report: 'no',
      o_additional_high_risk_condition: '',
      o_has_danger_sign: 'yes',
      o_vaginal_bleeding: 'yes',
      o_fits: 'no',
      o_severe_abdominal_pain: 'no',
      o_severe_headache: 'no',
      o_very_pale: 'no',
      o_fever: 'no',
      o_reduced_or_no_foetal_movements: 'no',
      o_breaking_water: 'no',
      o_easily_tired: 'no',
      o_face_hand_swelling: 'no',
      o_breathlessness: 'no',
      o_uses_llin: 'no',
      o_takes_iron_folate_daily: 'no',
      o_received_deworming_meds: '',
      o_tested_for_hiv_in_past_3_months: 'no',
      o_received_tetanus_toxoid_this_pregnancy: '',
      m_patient_uuid: 'patient_id',
      m_patient_id: 'patient_id',
      m_household_uuid: 'patient_parent_id',
      m_source: 'action',
      m_source_id: ''
    });
  });

  it('pregnancy with no pregnancy follow up date', async () => {
    // Load the pregnancy form and fill in
    const result = await harness.fillForm(...pregnancyRegistrationScenarios.safeNoFollowUp);

    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    // Verify some attributes on the resulting report
    expect(result.report.fields.data).to.deep.include({
      o_lmp_method: 'method_lmp',
      o_no_lmp_why_register: '',
      o_lmp_date: '1999-08-01',
      o_lmp_approx_weeks: '',
      o_lmp_approx_months: '',
      o_edd: '2000-05-07',
      o_num_previous_anc_hf_visits: '0',
      o_previous_anc_hf_visit_dates: '',
      o_next_anc_hf_visit_date_known: 'no',
      o_next_anc_hf_visit_date: '',
      o_has_risk_factors: 'no',
      o_first_pregnancy: 'no',
      o_previous_miscarriage: 'no',
      o_previous_difficulties: 'no',
      o_more_than_4_children: 'no',
      o_last_baby_born_less_than_1_year_ago: 'no',
      o_heart_condition: 'no',
      o_asthma: 'no',
      o_high_blood_pressure: 'no',
      o_diabetes: 'no',
      o_additional_high_risk_condition_to_report: 'no',
      o_additional_high_risk_condition: '',
      o_has_danger_sign: 'no',
      o_vaginal_bleeding: 'no',
      o_fits: 'no',
      o_severe_abdominal_pain: 'no',
      o_severe_headache: 'no',
      o_very_pale: 'no',
      o_fever: 'no',
      o_reduced_or_no_foetal_movements: 'no',
      o_breaking_water: 'no',
      o_easily_tired: 'no',
      o_face_hand_swelling: 'no',
      o_breathlessness: 'no',
      o_uses_llin: 'no',
      o_takes_iron_folate_daily: 'no',
      o_received_deworming_meds: 'no',
      o_tested_for_hiv_in_past_3_months: 'no',
      o_received_tetanus_toxoid_this_pregnancy: '',
      m_patient_uuid: 'patient_id',
      m_patient_id: 'patient_id',
      m_household_uuid: 'patient_parent_id',
      m_source: 'action',
      m_source_id: ''
    });
  });

  it('pregnancy with current weeks pregnant', async () => {
    // Load the pregnancy form and fill in
    const result = await harness.fillForm(...pregnancyRegistrationScenarios.safe12WeeksApprox);

    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    // Verify analytics fields on the resulting report
    expect(result.report.fields.data).to.deep.include({
      o_lmp_method: 'method_approx',
      o_no_lmp_why_register: '',
      o_lmp_date: '1999-10-09',
      o_lmp_approx_weeks: '12',
      o_lmp_approx_months: '',
      o_edd: '2000-07-15',
      o_num_previous_anc_hf_visits: '0',
      o_previous_anc_hf_visit_dates: '',
      o_next_anc_hf_visit_date_known: 'no',
      o_next_anc_hf_visit_date: '',
      o_has_risk_factors: 'no',
      o_first_pregnancy: 'no',
      o_previous_miscarriage: 'no',
      o_previous_difficulties: 'no',
      o_more_than_4_children: 'no',
      o_last_baby_born_less_than_1_year_ago: 'no',
      o_heart_condition: 'no',
      o_asthma: 'no',
      o_high_blood_pressure: 'no',
      o_diabetes: 'no',
      o_additional_high_risk_condition_to_report: 'no',
      o_additional_high_risk_condition: '',
      o_has_danger_sign: 'no',
      o_vaginal_bleeding: 'no',
      o_fits: 'no',
      o_severe_abdominal_pain: 'no',
      o_severe_headache: 'no',
      o_very_pale: 'no',
      o_fever: 'no',
      o_reduced_or_no_foetal_movements: 'no',
      o_breaking_water: 'no',
      o_easily_tired: 'no',
      o_face_hand_swelling: 'no',
      o_breathlessness: 'no',
      o_uses_llin: 'no',
      o_takes_iron_folate_daily: 'no',
      o_received_deworming_meds: '',
      o_tested_for_hiv_in_past_3_months: 'no',
      o_received_tetanus_toxoid_this_pregnancy: '',
      m_patient_uuid: 'patient_id',
      m_patient_id: 'patient_id',
      m_household_uuid: 'patient_parent_id',
      m_source: 'action',
      m_source_id: ''
    });
  });

  
  it('pregnancy with current months pregnant', async () => {
    // Load the pregnancy form and fill in
    const result = await harness.fillForm(...pregnancyRegistrationScenarios.safe3MonthsApprox);

    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    // Verify analytics fields on the resulting report
    expect(result.report.fields.data).to.deep.include({
      o_lmp_method: 'method_approx',
      o_no_lmp_why_register: '',
      o_lmp_date: '1999-10-01',
      o_lmp_approx_weeks: '',
      o_lmp_approx_months: '3',
      o_edd: '2000-07-07',
      o_num_previous_anc_hf_visits: '0',
      o_previous_anc_hf_visit_dates: '',
      o_next_anc_hf_visit_date_known: 'no',
      o_next_anc_hf_visit_date: '',
      o_has_risk_factors: 'no',
      o_first_pregnancy: 'no',
      o_previous_miscarriage: 'no',
      o_previous_difficulties: 'no',
      o_more_than_4_children: 'no',
      o_last_baby_born_less_than_1_year_ago: 'no',
      o_heart_condition: 'no',
      o_asthma: 'no',
      o_high_blood_pressure: 'no',
      o_diabetes: 'no',
      o_additional_high_risk_condition_to_report: 'no',
      o_additional_high_risk_condition: '',
      o_has_danger_sign: 'no',
      o_vaginal_bleeding: 'no',
      o_fits: 'no',
      o_severe_abdominal_pain: 'no',
      o_severe_headache: 'no',
      o_very_pale: 'no',
      o_fever: 'no',
      o_reduced_or_no_foetal_movements: 'no',
      o_breaking_water: 'no',
      o_easily_tired: 'no',
      o_face_hand_swelling: 'no',
      o_breathlessness: 'no',
      o_uses_llin: 'no',
      o_takes_iron_folate_daily: 'no',
      o_received_deworming_meds: 'no',
      o_tested_for_hiv_in_past_3_months: 'no',
      o_received_tetanus_toxoid_this_pregnancy: '',
      m_patient_uuid: 'patient_id',
      m_patient_id: 'patient_id',
      m_household_uuid: 'patient_parent_id',
      m_source: 'action',
      m_source_id: ''
    });
  });

  
  it('pregnancy with edd', async () => {
    // Load the pregnancy form and fill in
    const result = await harness.fillForm(...pregnancyRegistrationScenarios.safeWithEddMethod);

    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    // Verify analytics fields on the resulting report
    expect(result.report.fields.data).to.deep.include({
      o_lmp_method: 'method_edd',
      o_no_lmp_why_register: '',
      o_lmp_date: '1999-08-01',
      o_lmp_approx_weeks: '',
      o_lmp_approx_months: '',
      o_edd: '2000-05-07',
      o_num_previous_anc_hf_visits: '0',
      o_previous_anc_hf_visit_dates: '',
      o_next_anc_hf_visit_date_known: 'no',
      o_next_anc_hf_visit_date: '',
      o_has_risk_factors: 'no',
      o_first_pregnancy: 'no',
      o_previous_miscarriage: 'no',
      o_previous_difficulties: 'no',
      o_more_than_4_children: 'no',
      o_last_baby_born_less_than_1_year_ago: 'no',
      o_heart_condition: 'no',
      o_asthma: 'no',
      o_high_blood_pressure: 'no',
      o_diabetes: 'no',
      o_additional_high_risk_condition_to_report: 'no',
      o_additional_high_risk_condition: '',
      o_has_danger_sign: 'no',
      o_vaginal_bleeding: 'no',
      o_fits: 'no',
      o_severe_abdominal_pain: 'no',
      o_severe_headache: 'no',
      o_very_pale: 'no',
      o_fever: 'no',
      o_reduced_or_no_foetal_movements: 'no',
      o_breaking_water: 'no',
      o_easily_tired: 'no',
      o_face_hand_swelling: 'no',
      o_breathlessness: 'no',
      o_uses_llin: 'no',
      o_takes_iron_folate_daily: 'no',
      o_received_deworming_meds: 'no',
      o_tested_for_hiv_in_past_3_months: 'no',
      o_received_tetanus_toxoid_this_pregnancy: '',
      m_patient_uuid: 'patient_id',
      m_patient_id: 'patient_id',
      m_household_uuid: 'patient_parent_id',
      m_source: 'action',
      m_source_id: ''
    });
  });

});