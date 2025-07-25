const chai = require('chai');
const expect = chai.expect;
const moment = require('moment');
const TestRunner = require('cht-conf-test-harness');
const { MAX_DAYS_IN_PREGNANCY, range } = require('../test-helpers');
const { pregnancyRegistrationScenarios, pregnancyHomeVisitScenarios } = require('../form-inputs');
const harness = new TestRunner();

describe('Pregnancy related targets test', () => {
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

  it('active pregnancy target should show through pregnancy period', async () => {
    await harness.setNow('1999-10-10');//10 weeks after LMP date
    const pregnancy = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.safe10Weeks);
    expect(pregnancy.errors).to.be.empty;
    for (const day of range(70, MAX_DAYS_IN_PREGNANCY, 7)) {//check every 7 days
      await harness.setNow('1999-08-01');
      await harness.flush(day);
      const activePregnancies = await harness.getTargets({ type: 'active-pregnancies' });
      expect(activePregnancies).to.have.property('length', 1);
      if (day < MAX_DAYS_IN_PREGNANCY) {
        expect(activePregnancies[0]).to.nested.include({ 'value.pass': 1, 'value.total': 1 });
      }
      else {
        expect(activePregnancies[0]).to.nested.not.include({ 'value.pass': 1 });
        expect(activePregnancies[0]).to.nested.not.include({ 'value.total': 1 });
      }
    }
  });

  it('pregnancies this month target should show only the same month as pregnancy registered', async () => {
    await harness.setNow('1999-10-10');//10 weeks after LMP date
    const pregnancy = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.safe10Weeks);
    expect(pregnancy.errors).to.be.empty;
    for (const day of range(70, MAX_DAYS_IN_PREGNANCY, 7)) {
      await harness.setNow('1999-08-01');
      await harness.flush(day);
      const pregnanciesThisMonth = await harness.getTargets({ type: 'pregnancy-registrations-this-month' });
      expect(pregnanciesThisMonth).to.have.property('length', 1);
      if (moment('1999-08-01').add(day, 'days').isSame('1999-10-10', 'month')) {
        expect(pregnanciesThisMonth[0]).to.nested.include({ 'value.total': 1, 'value.pass': 1 });
      }
      else {
        expect(pregnanciesThisMonth[0]).to.nested.not.include({ 'value.pass': 1 });
        expect(pregnanciesThisMonth[0]).to.nested.not.include({ 'value.total': 1 });
      }
    }
  });

  it('active pregnancy with 1+ facility visits target should show through pregnancy period', async () => {
    await harness.setNow('1999-10-10');//10 weeks after LMP date
    const pregnancy = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.safe10Weeks);
    expect(pregnancy.errors).to.be.empty;

    await harness.setNow('1999-10-24');//12 weeks after LMP date

    let activePregnancies = await harness.getTargets({ type: 'active-pregnancies-1+-visits' });
    expect(activePregnancies[0]).to.nested.not.include({ 'value.pass': 1 });
    expect(activePregnancies[0]).to.nested.not.include({ 'value.total': 1 });

    await harness.loadForm('pregnancy_home_visit');
    const followupFormResult = await harness.fillForm(...pregnancyHomeVisitScenarios.safe1FacilityVisit);

    expect(followupFormResult.errors).to.be.empty;
    for (const day of range(84, MAX_DAYS_IN_PREGNANCY, 7)) { //starting from 12 weeks after LMP date
      await harness.setNow('1999-08-01');
      await harness.flush(day);
      activePregnancies = await harness.getTargets({ type: 'active-pregnancies-1+-visits' });
      expect(activePregnancies).to.have.property('length', 1);
      if (day < MAX_DAYS_IN_PREGNANCY) {
        expect(activePregnancies[0]).to.nested.include({ 'value.pass': 1, 'value.total': 1 });
      }
      else {
        expect(activePregnancies[0]).to.nested.not.include({ 'value.pass': 1 });
        expect(activePregnancies[0]).to.nested.not.include({ 'value.total': 1 });
      }
    }
  });

  it('active pregnancy with 4+ facility visits target should show through pregnancy period', async () => {
    await harness.setNow('1999-10-10');//10 weeks after LMP date
    const pregnancy = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.safe10Weeks);
    expect(pregnancy.errors).to.be.empty;
    await harness.setNow('1999-10-24');//12 weeks after LMP date

    let activePregnancies = await harness.getTargets({ type: 'active-pregnancies-4+-visits' });
    expect(activePregnancies[0]).to.nested.not.include({ 'value.pass': 1 });
    expect(activePregnancies[0]).to.nested.not.include({ 'value.total': 1 });

    await harness.loadForm('pregnancy_home_visit');
    const followupFormResult = await harness.fillForm(...pregnancyHomeVisitScenarios.safe4FacilityVisits);

    expect(followupFormResult.errors).to.be.empty;
    for (const day of range(84, MAX_DAYS_IN_PREGNANCY, 7)) { //starting from 12 weeks after LMP date
      await harness.setNow('1999-08-01');
      await harness.flush(day);
      activePregnancies = await harness.getTargets({ type: 'active-pregnancies-4+-visits' });
      expect(activePregnancies).to.have.property('length', 1);
      if (day < MAX_DAYS_IN_PREGNANCY) {
        expect(activePregnancies[0]).to.nested.include({ 'value.pass': 1, 'value.total': 1 });
      }
      else {
        expect(activePregnancies[0]).to.nested.not.include({ 'value.pass': 1 });
        expect(activePregnancies[0]).to.nested.not.include({ 'value.total': 1 });
      }
    }
  });
  it('active pregnancy with 1+ facility visits target if reported during pregnancy registration should show through pregnancy period', async () => {
    await harness.setNow('1999-10-10');//10 weeks after LMP date
    const pregnancy = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.safe10WeeksWith1FacilityVisit);
    expect(pregnancy.errors).to.be.empty;

    for (const day of range(84, MAX_DAYS_IN_PREGNANCY, 7)) { //starting from 12 weeks after LMP date
      await harness.setNow('1999-08-01');
      await harness.flush(day);
      const activePregnancies = await harness.getTargets({ type: 'active-pregnancies-1+-visits' });
      expect(activePregnancies).to.have.property('length', 1);
      if (day < MAX_DAYS_IN_PREGNANCY) {
        expect(activePregnancies[0]).to.nested.include({ 'value.pass': 1, 'value.total': 1 });
      }
      else {
        expect(activePregnancies[0]).to.nested.not.include({ 'value.pass': 1 });
        expect(activePregnancies[0]).to.nested.not.include({ 'value.total': 1 });
      }
    }
  });

  it('active pregnancy with 4+ facility visits target if reported during pregnancy registration should show through pregnancy period', async () => {
    await harness.setNow('1999-10-10');//10 weeks after LMP date
    let activePregnancies = await harness.getTargets({ type: 'active-pregnancies-4+-visits' });
    expect(activePregnancies[0]).to.nested.not.include({ 'value.pass': 1 });
    expect(activePregnancies[0]).to.nested.not.include({ 'value.total': 1 });

    const pregnancy = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.safe10WeeksWith4FacilityVisits);
    expect(pregnancy.errors).to.be.empty;

    for (const day of range(84, MAX_DAYS_IN_PREGNANCY, 7)) { //starting from 12 weeks after LMP date
      await harness.setNow('1999-08-01');
      await harness.flush(day);
      activePregnancies = await harness.getTargets({ type: 'active-pregnancies-4+-visits' });
      expect(activePregnancies).to.have.property('length', 1);
      if (day < MAX_DAYS_IN_PREGNANCY) {
        expect(activePregnancies[0]).to.nested.include({ 'value.pass': 1, 'value.total': 1 });
      }
      else {
        expect(activePregnancies[0]).to.nested.not.include({ 'value.pass': 1 });
        expect(activePregnancies[0]).to.nested.not.include({ 'value.total': 1 });
      }
    }
  });

  it('active pregnancy with 4+ facility visits target, when filled from each pregnancy home visit should show through pregnancy period', async () => {
    await harness.setNow('1999-10-10');//10 weeks after LMP date
    const pregnancy = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.safe10Weeks);
    expect(pregnancy.errors).to.be.empty;

    await harness.setNow('1999-10-24');//12 weeks after LMP date

    let activePregnancies = await harness.getTargets({ type: 'active-pregnancies-4+-visits' });
    expect(activePregnancies[0]).to.nested.not.include({ 'value.pass': 1 });
    expect(activePregnancies[0]).to.nested.not.include({ 'value.total': 1 });

    for (let i = 0; i < 4; i++) {
      await harness.loadForm('pregnancy_home_visit');
      const followupFormResult = await harness.fillForm(...pregnancyHomeVisitScenarios.safe1FacilityVisit);
      expect(followupFormResult.errors).to.be.empty;

      if (i < 3) {
        activePregnancies = await harness.getTargets({ type: 'active-pregnancies-4+-visits' });
        expect(activePregnancies[0]).to.nested.not.include({ 'value.pass': 1 });
        expect(activePregnancies[0]).to.nested.not.include({ 'value.total': 1 });
      }
      else {
        activePregnancies = await harness.getTargets({ type: 'active-pregnancies-4+-visits' });
        expect(activePregnancies).to.have.property('length', 1);
        expect(activePregnancies[0]).to.nested.include({ 'value.pass': 1, 'value.total': 1 });
      }
    }
    for (const day of range(20 * 7, MAX_DAYS_IN_PREGNANCY, 7)) { //starting from 20 weeks after LMP date
      await harness.setNow('1999-08-01');
      await harness.flush(day);
      activePregnancies = await harness.getTargets({ type: 'active-pregnancies-4+-visits' });
      expect(activePregnancies).to.have.property('length', 1);
      if (day < MAX_DAYS_IN_PREGNANCY) {
        expect(activePregnancies[0]).to.nested.include({ 'value.pass': 1, 'value.total': 1 });
      }
      else {
        expect(activePregnancies[0]).to.nested.not.include({ 'value.pass': 1 });
        expect(activePregnancies[0]).to.nested.not.include({ 'value.total': 1 });
      }
    }
  });

  it('active pregnancy with 8+ contacts target, when filled from each pregnancy home visit should show through pregnancy period', async () => {
    await harness.setNow('1999-10-10');//10 weeks after LMP date
    const pregnancy = await harness.fillForm('pregnancy', ...pregnancyRegistrationScenarios.safe10Weeks);
    expect(pregnancy.errors).to.be.empty;

    await harness.setNow('1999-10-24');//12 weeks after LMP date

    let activePregnancies = await harness.getTargets({ type: 'active-pregnancies-8+-contacts' });
    expect(activePregnancies[0]).to.nested.not.include({ 'value.pass': 1 });
    expect(activePregnancies[0]).to.nested.not.include({ 'value.total': 1 });

    let countRoutineContacts = 1; //pregnancy registration = 1 contact
    for (let i = 0; i < 5; i++) {
      await harness.loadForm('pregnancy_home_visit');
      const followupFormResult = await harness.fillForm(...pregnancyHomeVisitScenarios.safe1FacilityVisit);
      expect(followupFormResult.errors).to.be.empty;
      countRoutineContacts += 2; //1 pregnancy home visit +  1 facility visit

      if (countRoutineContacts < 8) {
        activePregnancies = await harness.getTargets({ type: 'active-pregnancies-8+-contacts' });
        expect(activePregnancies[0]).to.nested.not.include({ 'value.pass': 1 });
        expect(activePregnancies[0]).to.nested.not.include({ 'value.total': 1 });
      }
      else {
        activePregnancies = await harness.getTargets({ type: 'active-pregnancies-8+-contacts' });
        expect(activePregnancies).to.have.property('length', 1);
        expect(activePregnancies[0]).to.nested.include({ 'value.pass': 1, 'value.total': 1 });
      }
    }
    for (const day of range(28 * 7, MAX_DAYS_IN_PREGNANCY, 7)) { //starting from 28 weeks after LMP date
      await harness.setNow('1999-08-01');
      await harness.flush(day);
      activePregnancies = await harness.getTargets({ type: 'active-pregnancies-8+-contacts' });
      expect(activePregnancies).to.have.property('length', 1);
      if (day < MAX_DAYS_IN_PREGNANCY) {
        expect(activePregnancies[0]).to.nested.include({ 'value.pass': 1, 'value.total': 1 });
      }
      else {
        expect(activePregnancies[0]).to.nested.not.include({ 'value.pass': 1 });
        expect(activePregnancies[0]).to.nested.not.include({ 'value.total': 1 });
      }
    }
  });
});
