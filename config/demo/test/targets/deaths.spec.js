const chai = require('chai');
const expect = chai.expect;
const TestRunner = require('cht-conf-test-harness');
const { babyDeceasedAtAge1Day } = require('../contacts');
const harness = new TestRunner();

describe('Death related targets tests', () => {
  before(async () => {
    return await harness.start();
  });
  after(async () => {
    return await harness.stop();
  });
  beforeEach(async () => {
    await harness.clear();
  });
  afterEach(() => {
    expect(harness.consoleErrors).to.be.empty;
  });

  it('death this month target test this month', async () => {
    await harness.setNow('2000-04-30');//DOD: 2000-04-25
    harness.subject = babyDeceasedAtAge1Day;
    const deathsThisMonth = await harness.getTargets({ type: 'deaths-this-month' });
    expect(deathsThisMonth).to.deep.equal([{
      goal: 0,
      icon: 'icon-death-general',
      id: 'deaths-this-month',
      subtitle_translation_key: 'targets.this_month.subtitle',
      translation_key: 'targets.death_reporting.deaths.title',
      type: 'count',
      value: {
        pass: 1,
        total: 1
      }
    }]);
  });

  it('death this month target test next month', async () => {
    await harness.setNow('2000-05-30');//DOD: 2000-04-25
    harness.subject = babyDeceasedAtAge1Day;
    const deathsThisMonth = await harness.getTargets({ type: 'deaths-this-month' });
    expect(deathsThisMonth).to.deep.equal([{
      goal: 0,
      icon: 'icon-death-general',
      id: 'deaths-this-month',
      subtitle_translation_key: 'targets.this_month.subtitle',
      translation_key: 'targets.death_reporting.deaths.title',
      type: 'count',
      value: {
        pass: 0,
        total: 0
      }
    }]);
  });

});
