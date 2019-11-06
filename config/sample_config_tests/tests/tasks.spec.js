const { assert } = require('chai');
const path = require('path');
const sinon = require('sinon');
const TestHarness = require('medic-conf-test-harness');

const now = 1469358731456;
const harness = new TestHarness({
  directory: path.join(__dirname, '..'),
});

describe('old skoool rules example', () => {
  before(() => sinon.useFakeTimers(now));
  after(() => sinon.restore());
  // removing facts after each test is run from the nools engine
  afterEach(() => harness.clear());

  it('should be scheduled 1 day after assessment', async () => {
    harness.state.contacts.push({
      type: 'person',
      name: 'Zoe',
      date_of_birth: '2015-09-01',
      reported_date: Date.now(),
      _id: 'contact-1'
    });

    // a sample report object. Used to drive tasks that are triggered by reports
    const report = {
      _id: 'report-1',
      fields: {
        treatment_follow_up: 'true',
        referral_follow_up: 'true'
      },
      form: 'assessment',
      patient_id: 'contact-1',
      reported_date: now
    };
    harness.pushMockedReport(report);

    // having rules engine trigger the tasks rules and emit any
    // tasks that are matched based on current facts
    const tasks = await harness.getTasks({ resolved: true });

    // assert values based upon the emitted tasks
    assert.equal(tasks.length, 1);
    const task = tasks[0];
    // The id in new version is generated with report id and event id.
    // Where as in previous nools.rules.js the id was set
    assert.equal(task._id, report._id + '~' + 'treatment-followup-1~0');
    assert.equal(task.priority, 'high');
    assert.equal(task.title[0].locale, 'en');
    assert.equal(task.title[0].content, 'Postnatal visit needed');
    assert.equal(task.priorityLabel, 'this is a test');
  });
});
