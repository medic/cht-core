const { expect } = require('chai');
const TestRunner = require('cht-conf-test-harness');
const moment = require('moment');
const { pregnancyRegistrationScenarios, pregnancyHomeVisitScenarios } = require('../form-inputs');
const harness = new TestRunner();

describe('Tests for active pregnancy condition card', () => {
  before(() => harness.start());
  after(async () => { return await harness.stop(); });
  beforeEach(async () => {
    await harness.clear();
    return await harness.setNow('2000-01-01');
  });
  afterEach(() => {
    expect(harness.consoleErrors).to.be.empty;
  });

  it('pregnancy registration with risk factors, danger signs, past and future visits', async () => {
    // Load the pregnancy form and fill in
    const result = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.riskDanger);

    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    // Verify condition card
    const contactSummary = await harness.getContactSummary();
    expect(contactSummary.cards).to.have.property('length', 1);
    const activePregnancyCard = contactSummary.cards[0];
    expect(activePregnancyCard).to.have.property('label', 'contact.profile.pregnancy.active');
    const fields = activePregnancyCard.fields;
    expect(fields).to.have.property('length', 7);
    expect(fields[0]).to.deep.equal(
      {
        'label': 'Weeks Pregnant',
        'value': {
          'number': 21, //21 weeks and 6 days
          'approximate': false
        },
        'translate': false,
        'filter': 'weeksPregnant',
        'width': 6
      });
    expect(fields[1]).to.deep.equal({
      'label': 'contact.profile.edd',
      'value': moment('2000-05-07').valueOf(), //LMP date + 280 days
      'translate': false,
      'filter': 'simpleDate',
      'width': 6
    });
    expect(fields[2]).to.deep.equal({
      'label': 'contact.profile.risk.high',
      'value': 'contact.profile.risk.multiple',
      'translate': true,
      'icon': 'icon-risk',
      'width': 6
    });
    expect(fields[3]).to.deep.equal({
      'label': 'contact.profile.danger_signs.current',
      'value': 'contact.profile.danger_sign.vaginal_bleeding',
      'translate': true,
      'width': 6
    });
    expect(fields[4]).to.deep.equal({
      'label': 'contact.profile.visit',
      'value': 'contact.profile.visits.of',
      'context': {
        'count': 1,
        'total': 8
      },
      'translate': true,
      'width': 6
    });
    expect(fields[5]).to.deep.equal({
      'label': 'contact.profile.last_visited',
      'value': moment('2000-01-01').valueOf(),
      'filter': 'relativeDay',
      'width': 6
    });
    expect(fields[6]).to.deep.equal({
      'label': 'contact.profile.anc.next',
      'value': moment('2000-01-15').valueOf(),
      'filter': 'simpleDate',
      'width': 6
    });
  });

  it('pregnancy registration with no known LMP, no risk factors, no danger signs, no past and future visits', async () => {
    // Load the pregnancy form and fill in
    const result = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.lmpUnknown);

    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    // Verify condition card
    const contactSummary = await harness.getContactSummary();
    expect(contactSummary.cards).to.have.property('length', 1);
    const activePregnancyCard = contactSummary.cards[0];
    expect(activePregnancyCard).to.have.property('label', 'contact.profile.pregnancy.active');
    const fields = activePregnancyCard.fields;
    expect(fields).to.have.property('length', 4);
    expect(fields[0]).to.deep.equal({
      'label': 'Weeks Pregnant',
      'value': 'contact.profile.value.unknown',
      'translate': true,
      'filter': '',
      'width': 6
    });
    expect(fields[1]).to.deep.equal({
      'label': 'contact.profile.edd',
      'value': 'contact.profile.value.unknown',
      'translate': true,
      'filter': '',
      'width': 6
    });
    expect(fields[2]).to.deep.equal({
      'label': 'contact.profile.visit',
      'value': 'contact.profile.visits.of',
      'context': {
        'count': 0,
        'total': 8
      },
      'translate': true,
      'width': 6
    });
    expect(fields[3]).to.deep.equal({
      'label': 'contact.profile.last_visited',
      'value': moment('2000-01-01').valueOf(),
      'filter': 'relativeDay',
      'width': 6
    });
  });

  it('pregnancy registration updated by pregnancy home visit', async () => {
    // Load the pregnancy form and fill in
    const result = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.riskDanger);
    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    await harness.flush(3 * 7); //After 2 weeks

    const homeVisitResult = await harness.fillForm('pregnancy_home_visit', ...pregnancyHomeVisitScenarios.riskDangerUpdateEDD);
    expect(homeVisitResult.errors).to.be.empty;

    // Verify condition card
    const contactSummary = await harness.getContactSummary();
    expect(contactSummary.cards).to.have.property('length', 1);
    const activePregnancyCard = contactSummary.cards[0];
    expect(activePregnancyCard).to.have.property('label', 'contact.profile.pregnancy.active');
    const fields = activePregnancyCard.fields;
    expect(fields).to.have.property('length', 6);
    expect(fields[0]).to.deep.equal({
      'label': 'Weeks Pregnant',
      'value': {
        'number': 24, //24 weeks and 6 days
        'approximate': false
      },
      'translate': false,
      'filter': 'weeksPregnant',
      'width': 6
    });
    expect(fields[1]).to.deep.equal({
      'label': 'contact.profile.edd',
      'value': moment('2000-05-10').valueOf(), //(updated EDD)
      'translate': false,
      'filter': 'simpleDate',
      'width': 6
    });
    expect(fields[2]).to.deep.equal({
      'label': 'contact.profile.risk.high',
      'value': 'contact.profile.risk.multiple',
      'translate': true,
      'icon': 'icon-risk',
      'width': 6
    });
    expect(fields[3]).to.deep.equal({
      'label': 'contact.profile.danger_signs.current',
      'value': 'contact.profile.danger_sign.multiple',
      'translate': true,
      'width': 6
    });
    expect(fields[4]).to.deep.equal({
      'label': 'contact.profile.visit',
      'value': 'contact.profile.visits.of',
      'context': {
        'count': 2,
        'total': 8
      },
      'translate': true,
      'width': 6
    });
    expect(fields[5]).to.deep.equal({
      'label': 'contact.profile.last_visited',
      'value': moment('2000-01-22').valueOf(),
      'filter': 'relativeDay',
      'width': 6
    });
  });

  it('pregnancy registration cleared by pregnancy home visit', async () => {
    // Load the pregnancy form and fill in
    const result = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.riskDanger);
    // Verify that the form successfully got submitted
    expect(result.errors).to.be.empty;

    await harness.flush(3 * 7);//After 3 weeks
    
    const homeVisitResult = await harness.fillForm('pregnancy_home_visit', ...pregnancyHomeVisitScenarios.clearAll);
    expect(homeVisitResult.errors).to.be.empty;

    // Verify condition card
    const contactSummary = await harness.getContactSummary();
    expect(contactSummary.cards).to.have.property('length', 1);
    const activePregnancyCard = contactSummary.cards[0];
    expect(activePregnancyCard).to.have.property('label', 'contact.profile.pregnancy.active');
    const fields = activePregnancyCard.fields;
    expect(fields).to.have.property('length', 8);
    expect(fields[0]).deep.equal(
      {
        'label': 'contact.profile.change_care',
        'value': 'Migrated out of area',
        'width': 6
      }
    );
    expect(fields[1]).deep.equal(
      {
        'label': 'contact.profile.tasks_on_off',
        'value': 'Off',
        'width': 6
      }
    );
    expect(fields[2]).to.deep.equal({
      'label': 'Weeks Pregnant',
      'value': {
        'number': 24, //24 weeks and 3 days
        'approximate': false
      },
      'translate': false,
      'filter': 'weeksPregnant',
      'width': 6
    });
    expect(fields[3]).to.deep.equal({
      'label': 'contact.profile.edd',
      'value': moment('2000-05-07').valueOf(), //LMP date + 280 days
      'translate': false,
      'filter': 'simpleDate',
      'width': 6
    });
    expect(fields[4]).to.deep.equal({
      'label': 'contact.profile.risk.high',
      'value': 'contact.profile.risk.multiple',
      'translate': true,
      'icon': 'icon-risk',
      'width': 6
    });
    expect(fields[5]).to.deep.equal({
      'label': 'contact.profile.danger_signs.current',
      'value': 'contact.profile.danger_sign.vaginal_bleeding',
      'translate': true,
      'width': 6
    });
    expect(fields[6]).to.deep.equal({
      'label': 'contact.profile.visit',
      'value': 'contact.profile.visits.of',
      'context': {
        'count': 1,
        'total': 8
      },
      'translate': true,
      'width': 6
    });
    expect(fields[7]).to.deep.equal({
      'label': 'contact.profile.last_visited',
      'value': moment('2000-01-22').valueOf(),
      'filter': 'relativeDay',
      'width': 6
    });
  });

});
