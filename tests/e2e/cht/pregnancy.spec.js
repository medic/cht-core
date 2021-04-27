const utils = require('../../utils');
const commonElements = require('../../page-objects/common/common.po');
const loginPage = require('../../page-objects/login/login.po');
const contactsPage = require('../../page-objects/contacts/contacts.po');
const helper = require('../../helper');
// const pregnancyFormPo = require('../../page-objects/forms/cht/pregnancy-form.po');
const analyticsPo = require('../../page-objects/analytics/analytics.po');
// const pregnancyHomeVisit = require('../../page-objects/forms/cht/pregnancy-home-visit.po'); 
const moment = require('moment');
// const deliverPo = require('../../page-objects/forms/cht/delivery.po'); 
const Factory = require('rosie').Factory;
require('/home/newt/dev/cht-core/tests/factories/reports/cht/pregnancy.js');
const formFiller = require('../../form-filling').fillForm;
require('../../factories/reports/cht/pregnancy-visit');
require('../../factories/reports/cht/delivery');
const genericFormPo = require('../../page-objects/forms/generic-form.po');
require('/home/newt/dev/cht-core/tests/factories/reports/cht/pregnancy.js');

const password = 'Secret_1';
const district = {
  _id: 'PARENT_PLACE',
  type: 'district_hospital',
  name: 'Dist 1',
};

const pregnancy_woman =  {
  _id: 'test_woman',
  parent: {
    _id: 'clinic1',
    parent: {
      _id: 'offline_health_center',
      parent: {
        _id: 'PARENT_PLACE'
      }
    }
  },
  type: 'person',
  name: 'Mary Smith',
  date_of_birth: '2000-02-01',
  ephemeral_dob: {
    dob_calendar: '2000-02-01',
    ephemeral_months: 3,
    ephemeral_years: 2021,
    dob_approx: '2021-03-30',
    dob_raw: '2000-02-01',
    dob_iso: '2000-02-01'
  },
  sex: 'female',
  patient_id: 'test_woman_1'
};

const clinic = {
  _id: 'clinic1',
  type: 'clinic',
  name: 'Clinic1',
  parent: { _id: 'offline_health_center'},
  reported_date: 100,
};


const docs = [
  clinic,
  pregnancy_woman,
  district
];

const users = [
  {
    username: 'user1',
    password: password,
    place: {
      _id: 'offline_health_center',
      type: 'health_center',
      name: 'Offline place',
      parent: 'PARENT_PLACE'
    },
    contact: {
      _id: 'fixture:user:user1',
      name: 'OfflineUser'
    },
    roles: ['chw']
  },
];

describe('Pregnancy workflow on cht : ', () => {
  let originalTimeout;
  beforeEach(function() {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000000;
  });

  afterEach(function() {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
  });

  beforeAll(async () => {
    await utils.saveDocs([...docs]);
    await utils.createUsers(users);
  });

  it('should register a pregnancy', async () => {
    await commonElements.goToLoginPageNative();
    await loginPage.loginNative('user1', password);
    await utils.closeTour();
    await commonElements.goToPeople();
    await contactsPage.selectLHSRowByText(clinic.name);
    await contactsPage.selectContactByName(pregnancy_woman.name);
    await helper.clickElementNative(contactsPage.newActions);
    await helper.clickElementNative(contactsPage.formById('pregnancy'));
    await helper.waitUntilReadyNative(genericFormPo.formTitle);
    const pregnancyReport = Factory.build('pregnancy');
    await formFiller(pregnancyReport.fields, 'pregnancy');
    const activePregnancyCard = await contactsPage.cardElementByHeaderText('Active Pregnancy');
    await helper.waitUntilReadyNative(activePregnancyCard);
    let activePregnancyCardValues = await contactsPage.cardChildrenValueArray(activePregnancyCard);
    expect(await activePregnancyCardValues[0]).toBe('34');
    const weeksAgo  = moment().subtract(34 * 7,'d');
    const AVG_DAYS_IN_PREGNANCY = 280;
    const edd = moment(weeksAgo).add(AVG_DAYS_IN_PREGNANCY,'d').format('D MMM, YYYY');
    expect(await activePregnancyCardValues[1]).toBe(edd);
    expect(await activePregnancyCardValues[2]).toBe('1 of 8');
    expect(await activePregnancyCardValues[3]).toBe('today');
    await commonElements.goToAnalytics();
    const pregnancyRegistrations = analyticsPo.targetById('pregnancy-registrations-this-month');
    await helper.waitUntilReadyNative(pregnancyRegistrations);
    const pregnancyCount = await analyticsPo.targetNumber(pregnancyRegistrations).getText();
    const pregnancyGoal = await analyticsPo.targetGoal(pregnancyRegistrations).getText();
    const pregnancyTitle = await analyticsPo.targetTitle(pregnancyRegistrations).getText();
    expect(pregnancyTitle).toBe('New pregnancies');
    expect(pregnancyCount).toBe('1');
    expect(pregnancyGoal).toBe('20');
    const activePregnancies = analyticsPo.targetById('active-pregnancies');
    await helper.waitUntilReadyNative(activePregnancies);
    const activeTitle = await analyticsPo.targetTitle(activePregnancies).getText();
    const activeCount = await  analyticsPo.targetNumber(activePregnancies).getText();
    expect(activeTitle).toBe('Active pregnancies');
    expect(activeCount).toBe('1');
    await browser.get(utils.getBaseUrl() + 'contacts/' + pregnancy_woman._id);
    await helper.clickElementNative(contactsPage.newActions);
    await helper.clickElementNative(contactsPage.formById('pregnancy_home_visit'));
    await helper.waitUntilReadyNative(genericFormPo.formTitle);
    const pregnancyVisitReport = Factory.build('pregnancyVisit');
    await formFiller(pregnancyVisitReport.fields,'pregnancy_home_visit');
    await helper.waitUntilReadyNative(activePregnancyCard);
    activePregnancyCardValues = await contactsPage.cardChildrenValueArray(activePregnancyCard);
    expect(activePregnancyCardValues[0]).toBe('34');
    expect(activePregnancyCardValues[1]).toBe(edd);
    expect(activePregnancyCardValues[2]).toBe('1 of 8');
    expect(activePregnancyCardValues[3]).toBe('today');
    await helper.waitElementToDisappearNative(commonElements.snackBarContent);
    await helper.clickElementNative(contactsPage.newActions);
    await helper.clickElementNative(contactsPage.formById('delivery'));
    await helper.waitUntilReadyNative(genericFormPo.formTitle);
    const deliveryReport = Factory.build('delivery');
    await formFiller(deliveryReport.fields,'delivery');
    const pastPregnancyCard = await contactsPage.cardElementByHeaderText('Past pregnancy');
    await helper.waitUntilReadyNative(pastPregnancyCard); 
    const pastPregnancyCardValues = await contactsPage.cardChildrenValueArray(pastPregnancyCard);
    const deliveryDate = moment().format('D MMM, YYYY');
    expect(await pastPregnancyCardValues[0]).toBe(deliveryDate);
    expect(await pastPregnancyCardValues[1]).toBe('Health facility');
    expect(await pastPregnancyCardValues[2]).toBe('1');
    expect(await pastPregnancyCardValues[3]).toBe('1');
    await commonElements.goToAnalytics();
    const liveBirths = analyticsPo.targetById('births-this-month');
    await helper.waitUntilReadyNative(liveBirths);
    const liveBirthsCount = await analyticsPo.targetNumber(liveBirths).getText();
    const liveBirthsTitle = await  analyticsPo.targetTitle(liveBirths).getText();
    expect(await liveBirthsCount).toBe('2');
    expect(await liveBirthsTitle).toBe('Live births');
    const inFacilityDeliveries = analyticsPo.targetById('facility-deliveries');
    const inFacilityDeliveriesCount = await analyticsPo.targetNumber(inFacilityDeliveries).getText();
    const inFacilityDeliveriesTitle = await analyticsPo.targetTitle(inFacilityDeliveries).getText();
    expect(await inFacilityDeliveriesCount).toBe('100% (1 of 1)');
    expect(await inFacilityDeliveriesTitle).toBe('In-facility deliveries');
  });
});
