const { expect } = require('chai');
const TestRunner = require('cht-conf-test-harness');
const { deliveryScenarios } = require('../form-inputs');
const harnessDefaults = require('../../harness.defaults.json');

const harness = new TestRunner();
const TODAY = '2000-01-01';
const patientDoc = harnessDefaults.docs.find(doc => doc._id === harnessDefaults.subject);

describe('Child Health Registration form', () => {
  before(() => harness.start());
  after(() => harness.stop());

  beforeEach(
    async() => {
      await harness.clear();
      await harness.setNow(new Date(TODAY));
    });

  afterEach(() => expect(harness.consoleErrors).to.be.empty);

  it('saves data when submitted', async() => {
    const deliveryForm = {
      form: 'delivery',
      content: {
        source: 'action',
        inputs: {
          meta: {
            location: {
              lat: 'my-lat',
              long: 'my-long',
            }
          }
        }
      }
    };
    const result = await harness.fillForm(deliveryForm, ...deliveryScenarios.liveBirth(TODAY));

    expect(result.errors).to.be.empty;
    expect(result.report.fields).to.deep.include({
      birth_date: TODAY,
      chw_sms: 'Good news, ! Patient Name (patient_id) has delivered at the health facility. We will alert you when it is time to refer them for PNC. Please monitor them for danger signs. Thank you! Congrats!',
      delivery_code: 'f',
      pregnancy_outcome: 'healthy',
      geolocation: 'my-lat,my-lat my-long,my-long',
      patient_id: patientDoc._id,
      patient_uuid: patientDoc._id,
      patient_name: patientDoc.name
    });
  });
});
