const { expect } = require('chai');
const TestRunner = require('cht-conf-test-harness');
const { deathReportScenarios } = require('../form-inputs');
const harnessDefaults = require('../../harness.defaults.json');

const harness = new TestRunner();
const TODAY = '2000-01-01';
const patientDoc = harnessDefaults.docs.find(doc => doc._id === harnessDefaults.subject);

describe('Death Report form', () => {
  before(() => harness.start());

  after(() => harness.stop());

  beforeEach(
    async() => {
      await harness.clear();
      await harness.setNow(new Date(TODAY));
    });

  afterEach(() => expect(harness.consoleErrors).to.be.empty);

  it('should submit successfully with today as the date of death', async() => {
    const result = await harness.fillForm('death_report', ...deathReportScenarios.withDeathDate(TODAY));

    expect(result.errors).to.be.empty;
    expect(result.report.fields).to.deep.include({
      patient_age_in_days: '10768',
      patient_age_in_months: '353',
      patient_age_in_years: '29',
      patient_display_name: patientDoc.name,
      patient_id: patientDoc._id,
      patient_name: patientDoc.name,
      patient_short_name: '',
      patient_uuid: patientDoc._id,
      data: {
        __date_of_death: TODAY,
        __death_information: 'Died while sleeping.',
        __place_of_death: 'health_facility',
        __place_of_death_other: '',
        meta: {
          __household_uuid: patientDoc.parent._id,
          __patient_id: patientDoc._id,
          __patient_uuid: patientDoc._id,
          __source: 'action',
          __source_id: ''
        }
      }
    });
  });
});
