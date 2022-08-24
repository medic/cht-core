const { expect } = require('chai');
const TestRunner = require('cht-conf-test-harness');
const { childHealthRegistrationScenarios } = require('../form-inputs');
const harnessDefaults = require('../../harness.defaults.json');

const harness = new TestRunner();
const patientDoc = harnessDefaults.docs.find(doc => doc._id === harnessDefaults.subject);

describe('Child Health Registration form', () => {
  before(() => harness.start());
  after(() => harness.stop());

  beforeEach(() => harness.clear());

  afterEach(() => expect(harness.consoleErrors).to.be.empty);

  it('saves data when submitted', async() => {
    const childHealthRegForm = {
      form: 'child_health_registration',
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
    const result = await harness.fillForm(childHealthRegForm, ...childHealthRegistrationScenarios.withNote('Hello World!'));

    expect(result.errors).to.be.empty;
    expect(result.report.fields).to.deep.include({
      chw_sms: 'Good news, ! Patient Name (patient_id) has been registered for Child Health messages. Thank you! Hello World!',
      geolocation: 'my-lat,my-lat my-long,my-long',
      patient_id: patientDoc._id,
      patient_uuid: patientDoc._id,
      patient_name: patientDoc.name
    });
  });
});
