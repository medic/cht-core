const { expect } = require('chai');
const TestRunner = require('medic-conf-test-harness');
const path = require('path');
const harness = new TestRunner({
  xformFolderPath: path.join(__dirname, '../../forms/app'),
});

describe('Getting started tests', () => {
  before(async () => { return await harness.start(); });
  after(async () => { return await harness.stop(); });
  beforeEach(async () => { return await harness.clear(); });
  afterEach(() => { expect(harness.consoleErrors).to.be.empty; });

  it('pregnancy form can be loaded', async () => {
    await harness.loadForm('pregnancy');
    expect(harness.state.pageContent).to.include('id="pregnancy"');
  });

   it('unit test confirming pregnancy with pregnancy followup date', async () => {
    await harness.setNow('2000-01-01 05:45');
    // Load the pregnancy form and fill in
    const result = await harness.fillForm('pregnancy', ['method_lmp'], ['1999-08-01'], [], ['0'], ['yes', '2000-01-15'], ['no', 'no'], ['none', 'no'], ['yes', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no'], ['no'], ['no'], ['no'], [], ['no'], []);

    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    // Verify some attributes on the resulting report
    expect(result.report.fields).to.deep.include({
      patient_name: 'Patient Name',
      t_danger_signs_referral_follow_up: 'yes',
      t_danger_signs_referral_follow_up_date: '2000-01-04',
      t_pregnancy_follow_up: 'yes',
      t_pregnancy_follow_up_date: '2000-01-15',
      edd_8601: '2000-05-07',
      days_since_lmp: '153',
      weeks_since_lmp_rounded: '21',
      lmp_method_approx: 'no'
    });
  });
  it('unit test confirming pregnancy with no pregnancy follow up date', async () => {
    await harness.setNow('2000-01-01');
    // Load the pregnancy form and fill in
    const result = await harness.fillForm('pregnancy', ['method_lmp'], ['1999-08-01'], [], ['0'], ['no'], [], ['no', 'no'], ['none', 'no'], ['no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no'], ['no'], ['no'], ['no'], [], ['no'], []);

    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    // Verify some attributes on the resulting report
    expect(result.report.fields).to.deep.include({
      patient_name: 'Patient Name',
      t_danger_signs_referral_follow_up: 'no'
    });
  });

  it('unit test confirming pregnancy with current weeks pregnant', async () => {
    await harness.setNow('2000-01-01 05:45');
    // Load the pregnancy form and fill in
    const result = await harness.fillForm('pregnancy', ['method_approx'], ['approx_weeks', '12'], [], ['0'], ['no'], [], ['no', 'no'], ['none', 'no'], ['no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no'], ['no'], ['no'], [], ['no'], []);

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

  
  it('unit test confirming pregnancy with current months pregnant', async () => {
    await harness.setNow('2000-01-01 05:45');
    // Load the pregnancy form and fill in
    const result = await harness.fillForm('pregnancy', ['method_approx'], ['approx_months', '3'], [], ['0'], ['no'], [], ['no', 'no'], ['none', 'no'], ['no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no'], ['no'], ['no'], ['no'], [], ['no'], []);

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

  it('unit test confirming pregnancy with edd', async () => {
    await harness.setNow('2000-01-01 05:45');
    // Load the pregnancy form and fill in
    const result = await harness.fillForm('pregnancy', ['method_edd'], ['2000-05-07'], [], ['0'], ['no'], [], ['no', 'no'], ['none', 'no'], ['no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no'], ['no'], ['no'], ['no'], [], ['no'], []);

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

   it('unit test confirming pregnancy form shows deworming question if pregnancy is more than 12 weeks', async () => {
    await harness.setNow('2000-01-01');
    // Load the pregnancy form and fill in
    const result = await harness.fillForm('pregnancy', ['method_lmp'], ['1999-10-07'], [], ['0'], ['no'], [], ['no', 'no'], ['none', 'no'], ['no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no'], ['no'], ['no'], ['no'], [], ['no'], []);

    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    // Verify some attributes on the resulting report
    expect(result.report.fields.safe_pregnancy_practices).to.have.property('deworming');
  });

  it('unit test confirming pregnancy form does not show deworming question if pregnancy is not more than 12 weeks', async () => {
    await harness.setNow('2000-01-01');
    // Load the pregnancy form and fill in
    const result = await harness.fillForm('pregnancy', ['method_lmp'], ['1999-10-08'], [], ['0'], ['no'], [], ['no', 'no'], ['none', 'no'], ['no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no', 'no'], ['no'], ['no'], [], ['no'], []);

    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    // Verify some attributes on the resulting report
    expect(result.report.fields.safe_pregnancy_practices).to.not.have.property('deworming');
  });
});