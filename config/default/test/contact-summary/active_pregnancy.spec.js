const { expect } = require('chai');
const TestRunner = require('medic-conf-test-harness');
const path = require('path');
const moment = require('moment');
const sinon = require('sinon');
const { pregnancyRegistrationScenarios, pregnancyHomeVisitScenarios } = require('../form-inputs');
const harness = new TestRunner({
  xformFolderPath: path.join(__dirname, '../../forms/app'),
});
let clock = sinon.useFakeTimers(moment('2000-01-01').toDate());
describe('Tests for active pregnancy condition card', () => {
  before(async () => { return await harness.start(); });
  after(async () => { return await harness.stop(); });
  beforeEach(async () => {
    await harness.clear();
    clock = sinon.useFakeTimers(moment('2000-01-01').toDate());
    return await harness.setNow('2000-01-01');
  });
  afterEach(() => {
    expect(harness.consoleErrors).to.be.empty;
    if (clock) clock.restore();
  });

  it('pregnancy registration with risk factors, danger signs, past and future visits', async () => {
    // Load the pregnancy form and fill in
    const result = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.riskDanger);

    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    // Verify condition card
    const contactSummary = harness.getContactSummary();
    expect(contactSummary.cards).to.have.property('length', 1);
    const activePregnancyCard = contactSummary.cards[0];
    expect(activePregnancyCard).to.have.property('label', 'contact.profile.pregnancy.active');
    const fields = activePregnancyCard.fields;
    expect(fields).to.have.property('length', 7);
    expect(fields[0]).to.deep.equal(
      {
        "label": "Weeks Pregnant",
        "value": {
          "number": 21,//21 weeks and 6 days
          "approximate": false
        },
        "translate": false,
        "filter": "weeksPregnant",
        "width": 6
      });
    expect(fields[1]).to.deep.equal({
      "label": "contact.profile.edd",
      "value": moment('2000-05-07').valueOf(),//LMP date + 280 days
      "translate": false,
      "filter": "simpleDate",
      "width": 6
    });
    expect(fields[2]).to.deep.equal({
      "label": "contact.profile.risk.high",
      "value": "Asthma; underweight",
      "icon": "icon-risk",
      "width": 6
    });
    expect(fields[3]).to.deep.equal({
      "label": "contact.profile.danger_signs.current",
      "value": "Vaginal bleeding",
      "width": 6
    });
    expect(fields[4]).to.deep.equal({
      "label": "contact.profile.visit",
      "value": "contact.profile.visits.of",
      "context": {
        "count": 1,
        "total": 8
      },
      "translate": true,
      "width": 6
    });
    expect(fields[5]).to.deep.equal({
      "label": "contact.profile.last_visited",
      "value": "0 weeks ago",
      "width": 6
    });
    expect(fields[6]).to.deep.equal({
      "label": "contact.profile.anc.next",
      "value": moment('2000-01-15').valueOf(),
      "filter": "simpleDate",
      "width": 6
    });
  });

  it('pregnancy registration with no known LMP, no risk factors, no danger signs, no past and future visits', async () => {
    // Load the pregnancy form and fill in
    const result = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.lmpUnknown);

    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    // Verify condition card
    const contactSummary = harness.getContactSummary();
    expect(contactSummary.cards).to.have.property('length', 1);
    const activePregnancyCard = contactSummary.cards[0];
    expect(activePregnancyCard).to.have.property('label', 'contact.profile.pregnancy.active');
    const fields = activePregnancyCard.fields;
    expect(fields).to.have.property('length', 4);
    expect(fields[0]).to.deep.equal({
      "label": "Weeks Pregnant",
      "value": "contact.profile.value.unknown",
      "translate": true,
      "filter": "",
      "width": 6
    });
    expect(fields[1]).to.deep.equal({
      "label": "contact.profile.edd",
      "value": "contact.profile.value.unknown",
      "translate": true,
      "filter": "",
      "width": 6
    });
    expect(fields[2]).to.deep.equal({
      "label": "contact.profile.visit",
      "value": "contact.profile.visits.of",
      "context": {
        "count": 0,
        "total": 8
      },
      "translate": true,
      "width": 6
    });
    expect(fields[3]).to.deep.equal({
      "label": "contact.profile.last_visited",
      "value": "0 weeks ago",
      "width": 6
    });
  });

  it('pregnancy registration updated by pregnancy home visit', async () => {
    // Load the pregnancy form and fill in
    const result = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.riskDanger);
    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    await harness.flush(3 * 7);//After 2 weeks
    clock = sinon.useFakeTimers(moment('2000-01-01').add(3, 'weeks').toDate());

    await harness.loadForm('pregnancy_home_visit');
    const homeVisitResult = await harness.fillForm(...pregnancyHomeVisitScenarios.riskDangerUpdateEDD);
    expect(homeVisitResult.errors).to.be.empty;

    // Verify condition card
    let contactSummary = harness.getContactSummary();
    expect(contactSummary.cards).to.have.property('length', 1);
    const activePregnancyCard = contactSummary.cards[0];
    expect(activePregnancyCard).to.have.property('label', 'contact.profile.pregnancy.active');
    const fields = activePregnancyCard.fields;
    expect(fields).to.have.property('length', 6);
    expect(fields[0]).to.deep.equal({
      "label": "Weeks Pregnant",
      "value": {
        "number": 24,//24 weeks and 6 days
        "approximate": false
      },
      "translate": false,
      "filter": "weeksPregnant",
      "width": 6
    });
    expect(fields[1]).to.deep.equal({
      "label": "contact.profile.edd",
      "value": moment('2000-05-10').valueOf(),//(updated EDD)
      "translate": false,
      "filter": "simpleDate",
      "width": 6
    });
    expect(fields[2]).to.deep.equal({
      "label": "contact.profile.risk.high",
      "value": "Asthma; Diabetes; underweight; hypothyroidism",
      "icon": "icon-risk",
      "width": 6
    });
    expect(fields[3]).to.deep.equal({
      "label": "contact.profile.danger_signs.current",
      "value": "Vaginal bleeding, Fits, Severe abdominal pain, Severe headache, Very pale, Fever, Breaking of water, Getting tired easily, Swelling of face and hands, Breathlessness",
      "width": 6
    });
    expect(fields[4]).to.deep.equal({
      "label": "contact.profile.visit",
      "value": "contact.profile.visits.of",
      "context": {
        "count": 2,
        "total": 8
      },
      "translate": true,
      "width": 6
    });
    expect(fields[5]).to.deep.equal({
      "label": "contact.profile.last_visited",
      "value": "0 weeks ago",
      "width": 6
    });
  });

  it('pregnancy registration cleared by pregnancy home visit', async () => {
    // Load the pregnancy form and fill in
    const result = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.riskDanger);
    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    await harness.flush(3 * 7);//After 3 weeks
    clock = sinon.useFakeTimers(moment('2000-01-01').add(3, 'weeks').toDate());
    const homeVisitResult = await harness.fillForm('pregnancy_home_visit', ...pregnancyHomeVisitScenarios.clearAll);
    expect(homeVisitResult.errors).to.be.empty;

    // Verify condition card
    const contactSummary = harness.getContactSummary();
    expect(contactSummary.cards).to.have.property('length', 1);
    const activePregnancyCard = contactSummary.cards[0];
    expect(activePregnancyCard).to.have.property('label', 'contact.profile.pregnancy.active');
    const fields = activePregnancyCard.fields;
    expect(fields).to.have.property('length', 8);
    expect(fields[0]).deep.equal(
      {
        "label": "contact.profile.change_care",
        "value": "Migrated out of area",
        "width": 6
      }
    );
    expect(fields[1]).deep.equal(
      {
        "label": "contact.profile.tasks_on_off",
        "value": "Off",
        "width": 6
      }
    );
    expect(fields[2]).to.deep.equal({
      "label": "Weeks Pregnant",
      "value": {
        "number": 24,//24 weeks and 3 days
        "approximate": false
      },
      "translate": false,
      "filter": "weeksPregnant",
      "width": 6
    });
    expect(fields[3]).to.deep.equal({
      "label": "contact.profile.edd",
      "value": moment('2000-05-07').valueOf(),//LMP date + 280 days
      "translate": false,
      "filter": "simpleDate",
      "width": 6
    });
    expect(fields[4]).to.deep.equal({
      "label": "contact.profile.risk.high",
      "value": "Asthma; underweight",
      "icon": "icon-risk",
      "width": 6
    });
    expect(fields[5]).to.deep.equal({
      "label": "contact.profile.danger_signs.current",
      "value": "Vaginal bleeding",
      "width": 6
    });
    expect(fields[6]).to.deep.equal({
      "label": "contact.profile.visit",
      "value": "contact.profile.visits.of",
      "context": {
        "count": 1,
        "total": 8
      },
      "translate": true,
      "width": 6
    });
    expect(fields[7]).to.deep.equal({
      "label": "contact.profile.last_visited",
      "value": "0 weeks ago",
      "width": 6
    });
  });

});