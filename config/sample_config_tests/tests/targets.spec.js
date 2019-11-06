const { assert } = require('chai');
const path = require('path');
const sinon = require('sinon');
const TestHarness = require('medic-conf-test-harness');

const now = 1469358731456;
const harness = new TestHarness({
  directory: path.join(__dirname, '..'),
});

describe('target functionality', () => {
  before(() => sinon.useFakeTimers(now));
  after(() => sinon.restore());

  // removing facts after each test is run from the nools engine
  afterEach(() => harness.clear());

  it('should test target functionality', async () => {
    harness.state.contacts.push({
      type: 'person',
      name: 'Zoe',
      date_of_birth: '2015-09-01',
      reported_date: Date.now(),
      _id: 'contact-1'
    });

    // a sample report object. Used to drive tasks that are triggered by reports
    harness.pushMockedReport({
      _id: 'report-1',
      fields: {
        treatment_follow_up: 'true',
        referral_follow_up: 'true'
      },
      patient_id: 'contact-1',
      form: 'assessment',
      reported_date: now
    });

    // having nools engine trigger the tasks rules and emit any
    // tasks that are matched based on current facts
    const targets = await harness.getEmittedTargetInstances();
    
    // assert values based upon the emitted tasks
    return assert.equal(targets.length, 2);
  });
});
