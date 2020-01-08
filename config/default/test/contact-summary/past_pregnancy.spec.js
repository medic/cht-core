const { expect } = require('chai');
const TestRunner = require('medic-conf-test-harness');
const moment = require('moment');
const sinon = require('sinon');
const path = require('path');
const { pregnancyRegistrationScenarios, pregnancyHomeVisitScenarios, deliveryReportScenarios } = require('../form-inputs');
const harness = new TestRunner({
  xformFolderPath: path.join(__dirname, '../../forms/app'),
});

let clock;

describe('Tests for past pregnancy condition card', () => {
  before(async () => { return await harness.start(); });
  after(async () => { return await harness.stop(); });
  beforeEach(async () => { return await harness.clear(); });
  afterEach(() => {
    expect(harness.consoleErrors).to.be.empty;
    if (clock) {clock.restore();}
  });

  it('pregnancy registration with risk factors, one child healthy delivery', async () => {
    await harness.setNow('2000-01-01');

    clock = sinon.useFakeTimers(moment('2000-01-01').toDate());
    // Load the pregnancy form and fill in
    let result = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.riskDanger);
    expect(result.errors).to.be.empty;

    harness.setNow('2000-04-30');
    clock = sinon.useFakeTimers(moment('2000-04-30').toDate());
    //Load the delivery form and fill in
    result = await harness.fillForm('delivery', ...deliveryReportScenarios.oneChildHealthyFacility);
    expect(result.errors).to.be.empty;


    // Verify condition card
    const contactSummary = harness.getContactSummary();
    expect(contactSummary.cards).to.have.property('length', 1);
    const pastPregnancyCard = contactSummary.cards[0];
    expect(pastPregnancyCard).to.have.property('label', 'contact.profile.pregnancy.past');
    const fields = pastPregnancyCard.fields;
    expect(fields).to.have.property('length', 5);
    expect(fields[0]).to.deep.equal({
      'label': 'contact.profile.delivery_date',
      'value': moment('2000-04-22').valueOf(),
      'filter': 'simpleDate',
      'width': 6
    });
    expect(fields[1]).to.deep.equal({
      'label': 'contact.profile.delivery_place',
      'value': 'health_facility',
      'translate': true,
      'width': 6
    });
    expect(fields[2]).to.deep.equal({
      'label': 'contact.profile.delivered_babies',
      'value': '1',
      'width': 6
    });
    expect(fields[3]).to.deep.equal({
      'label': 'contact.profile.anc_visit',
      'value': 1,
      'width': 3
    });
    expect(fields[4]).to.deep.equal({
      'icon': 'icon-risk',
      'label': 'contact.profile.risk.high',
      'value': 'contact.profile.risk.multiple',
      'translate': true,
      'width': 6
    });
  });

  it('delivery with 2 children, both alive and healthy', async () => {
    await harness.setNow('2000-01-01');

    clock = sinon.useFakeTimers(moment('2000-01-01').toDate());
    // Load the pregnancy form and fill in
    let result = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.riskDanger);
    expect(result.errors).to.be.empty;

    harness.setNow('2000-04-30');
    clock = sinon.useFakeTimers(moment('2000-04-30').toDate());
    //Load the delivery form and fill in
    result = await harness.fillForm('delivery', ...deliveryReportScenarios.twoChildrenHealthy);
    expect(result.errors).to.be.empty;


    // Verify condition card
    const contactSummary = harness.getContactSummary();
    expect(contactSummary.cards).to.have.property('length', 1);
    const pastPregnancyCard = contactSummary.cards[0];
    expect(pastPregnancyCard).to.have.property('label', 'contact.profile.pregnancy.past');
    const fields = pastPregnancyCard.fields;
    expect(fields).to.have.property('length', 5);
    expect(fields[0]).to.deep.equal({
      'label': 'contact.profile.delivery_date',
      'value': moment('2000-04-22').valueOf(),
      'filter': 'simpleDate',
      'width': 6
    });
    expect(fields[1]).to.deep.equal({
      'label': 'contact.profile.delivery_place',
      'value': 'health_facility',
      'translate': true,
      'width': 6
    });
    expect(fields[2]).to.deep.equal({
      'label': 'contact.profile.delivered_babies',
      'value': '2',
      'width': 6
    });
    expect(fields[3]).to.deep.equal({
      'label': 'contact.profile.anc_visit',
      'value': 1,
      'width': 3
    });
    expect(fields[4]).to.deep.equal({
      'icon': 'icon-risk',
      'label': 'contact.profile.risk.high',
      'value': 'contact.profile.risk.multiple',
      'translate': true,
      'width': 6
    });
  });

  it('delivery with 3 children: 1 alive and healthy, 1 deceased, 1 stillbirth', async () => {
    await harness.setNow('2000-01-01');

    clock = sinon.useFakeTimers(moment('2000-01-01').toDate());
    // Load the pregnancy form and fill in
    let result = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.riskDanger);
    expect(result.errors).to.be.empty;

    harness.setNow('2000-04-30');
    clock = sinon.useFakeTimers(moment('2000-04-30').toDate());
    //Load the delivery form and fill in
    result = await harness.fillForm('delivery', ...deliveryReportScenarios.oneChildHealthyOneDeceasedOneStillbirth);
    expect(result.errors).to.be.empty;


    // Verify condition card
    const contactSummary = harness.getContactSummary();
    //fails with error: TypeError: babyDeaths.forEach is not a function
    //because the repeat group is expected to be an array
    expect(contactSummary.cards).to.have.property('length', 1);
    const pastPregnancyCard = contactSummary.cards[0];
    expect(pastPregnancyCard).to.have.property('label', 'contact.profile.pregnancy.past');
    const fields = pastPregnancyCard.fields;
    expect(fields).to.have.property('length', 14);
    expect(fields[0]).to.deep.equal({
      'label': 'contact.profile.delivery_date',
      'value': moment('2000-04-22').valueOf(),
      'filter': 'simpleDate',
      'width': 6
    });
    expect(fields[1]).to.deep.equal({
      'label': 'contact.profile.delivery_place',
      'value': 'health_facility',
      'translate': true,
      'width': 6
    });
    expect(fields[2]).to.deep.equal({
      'label': 'contact.profile.delivered_babies',
      'value': '3',
      'width': 6
    });
    expect(fields[3]).to.deep.equal({
      'label': 'contact.profile.deceased_babies',
      'value': '2',
      'width': 6
    });
    expect(fields[4]).to.deep.equal({
      'label': 'contact.profile.newborn.death_date',
      'value': '2000-04-22',
      'filter': 'simpleDate',
      'width': 6
    });
    expect(fields[5]).to.deep.equal({
      'label': 'contact.profile.newborn.death_place',
      'value': 'health_facility',
      'translate': true,
      'width': 6
    });
    expect(fields[6]).to.deep.equal({
      'label': 'contact.profile.delivery.stillbirthQ',
      'value': 'yes',
      'translate': true,
      'width': 6
    });
    expect(fields[7]).to.deep.equal({
      'label': '',
      'value': '',
      'width': 6
    });
    expect(fields[8]).to.deep.equal({
      'label': 'contact.profile.newborn.death_date',
      'value': '2000-04-23',
      'filter': 'simpleDate',
      'width': 6
    });
    expect(fields[9]).to.deep.equal({
      'label': 'contact.profile.newborn.death_place',
      'value': 'home',
      'translate': true,
      'width': 6
    });
    expect(fields[10]).to.deep.equal({
      'label': 'contact.profile.delivery.stillbirthQ',
      'value': 'no',
      'translate': true,
      'width': 6
    });
    expect(fields[11]).to.deep.equal({
      'label': '',
      'value': '',
      'width': 6
    });
    expect(fields[12]).to.deep.equal({
      'label': 'contact.profile.anc_visit',
      'value': 1,
      'width': 3
    });
    expect(fields[13]).to.deep.equal({
      'icon': 'icon-risk',
      'label': 'contact.profile.risk.high',
      'value': 'contact.profile.risk.multiple',
      'translate': true,
      'width': 6
    });
  });

  it('pregnancy registration with early end to pregnancy (miscarriage)', async () => {
    await harness.setNow('2000-01-01');

    clock = sinon.useFakeTimers(moment('2000-01-01').toDate());
    // Load the pregnancy form and fill in
    let result = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.riskDanger);
    expect(result.errors).to.be.empty;

    harness.setNow('2000-01-03');
    clock = sinon.useFakeTimers(moment('2000-01-03').toDate());
    //Load the delivery form and fill in
    result = await harness.fillForm('pregnancy_home_visit', ...pregnancyHomeVisitScenarios.miscarriage);
    expect(result.errors).to.be.empty;


    // Verify condition card
    const contactSummary = harness.getContactSummary();
    expect(contactSummary.cards).to.have.property('length', 1);
    const pastPregnancyCard = contactSummary.cards[0];
    expect(pastPregnancyCard).to.have.property('label', 'contact.profile.pregnancy.past');
    const fields = pastPregnancyCard.fields;
    expect(fields).to.have.property('length', 5);
    expect(fields[0]).to.deep.equal({
      'label': 'contact.profile.pregnancy.end_early',
      'value': 'miscarriage',
      'translate': true,
      'width': 6
    });
    expect(fields[1]).to.deep.equal({
      'label': 'contact.profile.pregnancy.end_date',
      'value': moment('2000-01-02').valueOf(),
      'filter': 'simpleDate',
      'width': 6
    });
    expect(fields[2]).to.deep.equal({
      'label': 'contact.profile.pregnancy.end_weeks',
      'value': 22,
      'translate': false,
      'width': 6
    });
    expect(fields[3]).to.deep.equal({
      'label': 'contact.profile.anc_visit',
      'value': 1,
      'width': 3
    });
    expect(fields[4]).to.deep.equal({
      'label': 'contact.profile.risk.high',
      'value': 'contact.profile.risk.multiple',
      'translate': true,
      'icon': 'icon-risk',
      'width': 6
    });
  });

  it('pregnancy registration with early end to pregnancy (abortion)', async () => {
    await harness.setNow('2000-01-01');

    clock = sinon.useFakeTimers(moment('2000-01-01').toDate());
    // Load the pregnancy form and fill in
    let result = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.riskDanger);
    expect(result.errors).to.be.empty;

    harness.setNow('2000-01-03');
    clock = sinon.useFakeTimers(moment('2000-01-03').toDate());
    //Load the delivery form and fill in
    result = await harness.fillForm('pregnancy_home_visit', ...pregnancyHomeVisitScenarios.abortion);
    expect(result.errors).to.be.empty;


    // Verify condition card
    const contactSummary = harness.getContactSummary();
    expect(contactSummary.cards).to.have.property('length', 1);
    const pastPregnancyCard = contactSummary.cards[0];
    expect(pastPregnancyCard).to.have.property('label', 'contact.profile.pregnancy.past');
    const fields = pastPregnancyCard.fields;
    expect(fields).to.have.property('length', 5);
    expect(fields[0]).to.deep.equal({
      'label': 'contact.profile.pregnancy.end_early',
      'value': 'abortion',
      'translate': true,
      'width': 6
    });
    expect(fields[1]).to.deep.equal({
      'label': 'contact.profile.pregnancy.end_date',
      'value': moment('2000-01-02').valueOf(),
      'filter': 'simpleDate',
      'width': 6
    });
    expect(fields[2]).to.deep.equal({
      'label': 'contact.profile.pregnancy.end_weeks',
      'value': 22,
      'translate': false,
      'width': 6
    });
    expect(fields[3]).to.deep.equal({
      'label': 'contact.profile.anc_visit',
      'value': 1,
      'width': 3
    });
    expect(fields[4]).to.deep.equal({
      'label': 'contact.profile.risk.high',
      'value': 'contact.profile.risk.multiple',
      'translate': true,
      'icon': 'icon-risk',
      'width': 6
    });
  });

});
