const { expect } = require('chai');
const TestRunner = require('cht-conf-test-harness');
const { pregnancyRegistrationScenarios } = require('../form-inputs');
const harness = new TestRunner();

describe('Pregnancy form tests', () => {
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
    expect(result.report.fields).to.deep.include({
      patient_name: 'Patient Name',
      t_danger_signs_referral_follow_up: 'yes',
      t_danger_signs_referral_follow_up_date: '2000-01-04',
      t_pregnancy_follow_up: 'yes',
      t_pregnancy_follow_up_date: '2000-01-20',
      edd_8601: '2000-08-07',
      days_since_lmp: '61',
      weeks_since_lmp_rounded: '8',
      lmp_method_approx: 'no'
    });
  });

  it('pregnancy with no pregnancy follow up date', async () => {
    // Load the pregnancy form and fill in
    const result = await harness.fillForm(...pregnancyRegistrationScenarios.safeNoFollowUp);

    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    // Verify some attributes on the resulting report
    expect(result.report.fields).to.deep.include({
      patient_name: 'Patient Name',
      t_danger_signs_referral_follow_up: 'no',
      t_pregnancy_follow_up: 'no',
    });
  });
  it('pregnancy with current weeks pregnant', async () => {
    // Load the pregnancy form and fill in
    const result = await harness.fillForm(...pregnancyRegistrationScenarios.safe12WeeksApprox);

    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    // Verify some attributes on the resulting report
    expect(result.report.fields).to.deep.include({
      patient_name: 'Patient Name',
      lmp_date_8601: '1999-10-09',
      edd_8601: '2000-07-15',
      days_since_lmp: '84',
      weeks_since_lmp_rounded: '12',
      lmp_method_approx: 'yes'
    });
  });

  it('pregnancy with current months pregnant', async () => {
    // Load the pregnancy form and fill in
    const result = await harness.fillForm(...pregnancyRegistrationScenarios.safe3MonthsApprox);

    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    // Verify some attributes on the resulting report
    expect(result.report.fields).to.deep.include({
      patient_name: 'Patient Name',
      lmp_date_8601: '1999-10-01',
      edd_8601: '2000-07-07',
      days_since_lmp: '92', //3*30.5
      weeks_since_lmp_rounded: '13',
      lmp_method_approx: 'yes'
    });
  });

  it('pregnancy with edd', async () => {
    // Load the pregnancy form and fill in
    const result = await harness.fillForm(...pregnancyRegistrationScenarios.safeWithEddMethod);

    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    // Verify some attributes on the resulting report
    expect(result.report.fields).to.deep.include({
      patient_name: 'Patient Name',
      lmp_date_8601: '1999-08-01',
      edd_8601: '2000-05-07',
      days_since_lmp: '153',
      weeks_since_lmp_rounded: '21',
      lmp_method_approx: 'no'
    });
  });

  it('pregnancy form shows deworming question if pregnancy is more than 12 weeks', async () => {
    // Load the pregnancy form and fill in
    const result = await harness.fillForm(...pregnancyRegistrationScenarios.safe12Weeks1Day);

    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    // Verify some attributes on the resulting report
    expect(result.report.fields.safe_pregnancy_practices).to.have.property('deworming');
  });

  it('pregnancy form does not show deworming question if pregnancy is not more than 12 weeks', async () => {
    // Load the pregnancy form and fill in
    const result = await harness.fillForm(...pregnancyRegistrationScenarios.safe12Weeks);

    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    // Verify some attributes on the resulting report
    expect(result.report.fields.safe_pregnancy_practices).to.not.have.property('deworming');
  });
});
