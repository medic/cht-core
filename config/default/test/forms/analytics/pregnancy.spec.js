const { expect } = require('chai');
const TestRunner = require('medic-conf-test-harness');
const { pregnancyRegistrationScenarios } = require('../../form-inputs');
const harness = new TestRunner();

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
      __lmp_method: 'method_lmp',
      __no_lmp_registration_reason: '',
      __lmp_date: '1999-11-01',
      __lmp_approx_weeks: '',
      __lmp_approx_months: '',
      __edd: '2000-08-07',
      __num_previous_anc_hf_visits: '0',
      __previous_anc_hf_visit_dates: '',
      __next_anc_hf_visit_date_known: 'yes',
      __next_anc_hf_visit_date: '2000-01-20',
      __has_risk_factors: 'no',
      __first_pregnancy: 'no',
      __previous_miscarriage: 'no',
      __previous_difficulties: 'no',
      __more_than_4_children: 'no',
      __last_baby_born_less_than_1_year_ago: 'no',
      __heart_condition: 'no',
      __asthma: 'no',
      __high_blood_pressure: 'no',
      __diabetes: 'no',
      __additional_high_risk_condition_to_report: 'no',
      __additional_high_risk_condition: '',
      __has_danger_sign: 'yes',
      __vaginal_bleeding: 'yes',
      __fits: 'no',
      __severe_abdominal_pain: 'no',
      __severe_headache: 'no',
      __very_pale: 'no',
      __fever: 'no',
      __reduced_or_no_fetal_movements: 'no',
      __breaking_water: 'no',
      __easily_tired: 'no',
      __face_hand_swelling: 'no',
      __breathlessness: 'no',
      __uses_llin: 'no',
      __takes_iron_folate_daily: 'no',
      __received_deworming_meds: '',
      __tested_for_hiv_in_past_3_months: 'no',
      __received_tetanus_toxoid_this_pregnancy: '',
      meta: {
        __patient_uuid: 'patient_id',
        __patient_id: 'patient_id',
        __household_uuid: 'patient_parent_id',
        __source: 'action',
        __source_id: ''
      }
    });
  });

  it('pregnancy with no pregnancy follow up date', async () => {
    // Load the pregnancy form and fill in
    const result = await harness.fillForm(...pregnancyRegistrationScenarios.safeNoFollowUp);

    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    // Verify some attributes on the resulting report
    expect(result.report.fields.data).to.deep.include({
      __lmp_method: 'method_lmp',
      __no_lmp_registration_reason: '',
      __lmp_date: '1999-08-01',
      __lmp_approx_weeks: '',
      __lmp_approx_months: '',
      __edd: '2000-05-07',
      __num_previous_anc_hf_visits: '0',
      __previous_anc_hf_visit_dates: '',
      __next_anc_hf_visit_date_known: 'no',
      __next_anc_hf_visit_date: '',
      __has_risk_factors: 'no',
      __first_pregnancy: 'no',
      __previous_miscarriage: 'no',
      __previous_difficulties: 'no',
      __more_than_4_children: 'no',
      __last_baby_born_less_than_1_year_ago: 'no',
      __heart_condition: 'no',
      __asthma: 'no',
      __high_blood_pressure: 'no',
      __diabetes: 'no',
      __additional_high_risk_condition_to_report: 'no',
      __additional_high_risk_condition: '',
      __has_danger_sign: 'no',
      __vaginal_bleeding: 'no',
      __fits: 'no',
      __severe_abdominal_pain: 'no',
      __severe_headache: 'no',
      __very_pale: 'no',
      __fever: 'no',
      __reduced_or_no_fetal_movements: 'no',
      __breaking_water: 'no',
      __easily_tired: 'no',
      __face_hand_swelling: 'no',
      __breathlessness: 'no',
      __uses_llin: 'no',
      __takes_iron_folate_daily: 'no',
      __received_deworming_meds: 'no',
      __tested_for_hiv_in_past_3_months: 'no',
      __received_tetanus_toxoid_this_pregnancy: '',
      meta: {
        __patient_uuid: 'patient_id',
        __patient_id: 'patient_id',
        __household_uuid: 'patient_parent_id',
        __source: 'action',
        __source_id: ''
      }
    });
  });

  it('pregnancy with current weeks pregnant', async () => {
    // Load the pregnancy form and fill in
    const result = await harness.fillForm(...pregnancyRegistrationScenarios.safe12WeeksApprox);

    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    // Verify analytics fields on the resulting report
    expect(result.report.fields.data).to.deep.include({
      __lmp_method: 'method_approx',
      __no_lmp_registration_reason: '',
      __lmp_date: '1999-10-09',
      __lmp_approx_weeks: '12',
      __lmp_approx_months: '',
      __edd: '2000-07-15',
      __num_previous_anc_hf_visits: '0',
      __previous_anc_hf_visit_dates: '',
      __next_anc_hf_visit_date_known: 'no',
      __next_anc_hf_visit_date: '',
      __has_risk_factors: 'no',
      __first_pregnancy: 'no',
      __previous_miscarriage: 'no',
      __previous_difficulties: 'no',
      __more_than_4_children: 'no',
      __last_baby_born_less_than_1_year_ago: 'no',
      __heart_condition: 'no',
      __asthma: 'no',
      __high_blood_pressure: 'no',
      __diabetes: 'no',
      __additional_high_risk_condition_to_report: 'no',
      __additional_high_risk_condition: '',
      __has_danger_sign: 'no',
      __vaginal_bleeding: 'no',
      __fits: 'no',
      __severe_abdominal_pain: 'no',
      __severe_headache: 'no',
      __very_pale: 'no',
      __fever: 'no',
      __reduced_or_no_fetal_movements: 'no',
      __breaking_water: 'no',
      __easily_tired: 'no',
      __face_hand_swelling: 'no',
      __breathlessness: 'no',
      __uses_llin: 'no',
      __takes_iron_folate_daily: 'no',
      __received_deworming_meds: '',
      __tested_for_hiv_in_past_3_months: 'no',
      __received_tetanus_toxoid_this_pregnancy: '',
      meta: {
        __patient_uuid: 'patient_id',
        __patient_id: 'patient_id',
        __household_uuid: 'patient_parent_id',
        __source: 'action',
        __source_id: ''
      }
    });
  });

  
  it('pregnancy with current months pregnant', async () => {
    // Load the pregnancy form and fill in
    const result = await harness.fillForm(...pregnancyRegistrationScenarios.safe3MonthsApprox);

    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    // Verify analytics fields on the resulting report
    expect(result.report.fields.data).to.deep.include({
      __lmp_method: 'method_approx',
      __no_lmp_registration_reason: '',
      __lmp_date: '1999-10-01',
      __lmp_approx_weeks: '',
      __lmp_approx_months: '3',
      __edd: '2000-07-07',
      __num_previous_anc_hf_visits: '0',
      __previous_anc_hf_visit_dates: '',
      __next_anc_hf_visit_date_known: 'no',
      __next_anc_hf_visit_date: '',
      __has_risk_factors: 'no',
      __first_pregnancy: 'no',
      __previous_miscarriage: 'no',
      __previous_difficulties: 'no',
      __more_than_4_children: 'no',
      __last_baby_born_less_than_1_year_ago: 'no',
      __heart_condition: 'no',
      __asthma: 'no',
      __high_blood_pressure: 'no',
      __diabetes: 'no',
      __additional_high_risk_condition_to_report: 'no',
      __additional_high_risk_condition: '',
      __has_danger_sign: 'no',
      __vaginal_bleeding: 'no',
      __fits: 'no',
      __severe_abdominal_pain: 'no',
      __severe_headache: 'no',
      __very_pale: 'no',
      __fever: 'no',
      __reduced_or_no_fetal_movements: 'no',
      __breaking_water: 'no',
      __easily_tired: 'no',
      __face_hand_swelling: 'no',
      __breathlessness: 'no',
      __uses_llin: 'no',
      __takes_iron_folate_daily: 'no',
      __received_deworming_meds: 'no',
      __tested_for_hiv_in_past_3_months: 'no',
      __received_tetanus_toxoid_this_pregnancy: '',
      meta: {
        __patient_uuid: 'patient_id',
        __patient_id: 'patient_id',
        __household_uuid: 'patient_parent_id',
        __source: 'action',
        __source_id: ''
      }
    });
  });

  
  it('pregnancy with edd', async () => {
    // Load the pregnancy form and fill in
    const result = await harness.fillForm(...pregnancyRegistrationScenarios.safeWithEddMethod);

    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    // Verify analytics fields on the resulting report
    expect(result.report.fields.data).to.deep.include({
      __lmp_method: 'method_edd',
      __no_lmp_registration_reason: '',
      __lmp_date: '1999-08-01',
      __lmp_approx_weeks: '',
      __lmp_approx_months: '',
      __edd: '2000-05-07',
      __num_previous_anc_hf_visits: '0',
      __previous_anc_hf_visit_dates: '',
      __next_anc_hf_visit_date_known: 'no',
      __next_anc_hf_visit_date: '',
      __has_risk_factors: 'no',
      __first_pregnancy: 'no',
      __previous_miscarriage: 'no',
      __previous_difficulties: 'no',
      __more_than_4_children: 'no',
      __last_baby_born_less_than_1_year_ago: 'no',
      __heart_condition: 'no',
      __asthma: 'no',
      __high_blood_pressure: 'no',
      __diabetes: 'no',
      __additional_high_risk_condition_to_report: 'no',
      __additional_high_risk_condition: '',
      __has_danger_sign: 'no',
      __vaginal_bleeding: 'no',
      __fits: 'no',
      __severe_abdominal_pain: 'no',
      __severe_headache: 'no',
      __very_pale: 'no',
      __fever: 'no',
      __reduced_or_no_fetal_movements: 'no',
      __breaking_water: 'no',
      __easily_tired: 'no',
      __face_hand_swelling: 'no',
      __breathlessness: 'no',
      __uses_llin: 'no',
      __takes_iron_folate_daily: 'no',
      __received_deworming_meds: 'no',
      __tested_for_hiv_in_past_3_months: 'no',
      __received_tetanus_toxoid_this_pregnancy: '',
      meta: {
        __patient_uuid: 'patient_id',
        __patient_id: 'patient_id',
        __household_uuid: 'patient_parent_id',
        __source: 'action',
        __source_id: ''
      }
    });
  });

});
