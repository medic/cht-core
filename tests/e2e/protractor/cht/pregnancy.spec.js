const utils = require('../../../utils');
const commonElements = require('../../../page-objects/common/common.po');
const loginPage = require('../../../page-objects/login/login.po');
const contactsPage = require('../../../page-objects/contacts/contacts.po');
const helper = require('../../../helper');
const analyticsPo = require('../../../page-objects/analytics/analytics.po');
const moment = require('moment');
const formFiller = require('../../../form-filling').fillForm;
const pregnancyReport = require('../../../factories/cht/reports/pregnancy.js');
const pregnancyVisitReport = require('../../../factories/cht/reports/pregnancy-visit');
const deliveryReport = require('../../../factories/cht/reports/delivery');
const userFactory = require('../../../factories/cht/users/users');
const personFactory = require('../../../factories/cht/contacts/person');
const place = require('../../../factories/cht/contacts/place');
const dateFormat = 'D MMM, YYYY';

const genericFormPo = require('../../../page-objects/forms/generic-form.po');
const chtPregnancy = require('../../../page-objects/forms/cht/pregnancy');
const chtPregnancyVisit = require('../../../page-objects/forms/cht/pregnancy-visit');
const chtDelivery = require('../../../page-objects/forms/cht/delivery');
const places = place.generateHierarchy();
const healthCenter = places.find((place) => place.type === 'health_center');
const clinic = places.find((place) => place.type === 'clinic');
const pregnancyWoman = personFactory.build(
  {
    parent: {
      _id: clinic._id,
      parent: clinic.parent
    }
  });

const offlineUser = userFactory.build({
  place: healthCenter._id
});


const docs = [...places, pregnancyWoman];


describe('Pregnancy workflow on cht : ', () => {
  let originalTimeout;
  beforeEach(function() {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 2 * 60 * 1000;
  });

  afterEach(function() {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
  });

  beforeAll(async () => {
    await utils.saveDocs(docs);
    await utils.createUsers([offlineUser]);
  });

  //TODO: flaky test - to fix
  xit('should register a pregnancy', async () => {
    await commonElements.goToLoginPageNative();
    await loginPage.loginNative(offlineUser.username, offlineUser.password);
    await utils.closeTour();
    await commonElements.goToPeople();
    await contactsPage.selectLHSRowByText(clinic.name);
    await contactsPage.selectContactByName(pregnancyWoman.name);
    await helper.clickElementNative(contactsPage.newActions);
    await helper.clickElementNative(contactsPage.formById('pregnancy'));
    await helper.waitUntilReadyNative(genericFormPo.formTitle);
    await formFiller(pregnancyReport.build().fields, 'pregnancy', chtPregnancy.pages);
    const activePregnancyCard = await contactsPage.cardElementByHeaderText('Active Pregnancy');
    await helper.waitUntilReadyNative(activePregnancyCard);
    const cardValues = await contactsPage.cardChildrenValueArray(activePregnancyCard);
    let [weeksPregnant, deliveryDate, ancVisit, lastVisit] = cardValues;
    const weeksAgo = moment().subtract(34 * 7, 'd');
    const AVG_DAYS_IN_PREGNANCY = 280;
    const edd = moment(weeksAgo).add(AVG_DAYS_IN_PREGNANCY, 'd').format(dateFormat);
    expect(weeksPregnant).toBe('34');
    expect(deliveryDate).toBe(edd);
    expect(ancVisit).toBe('1 of 8');
    expect(lastVisit).toBe('today');
    await commonElements.goToAnalytics();
    const pregnancyRegistrations = analyticsPo.targetById('pregnancy-registrations-this-month');
    await helper.waitUntilReadyNative(pregnancyRegistrations);
    const pregnancyCount = await helper.getTextFromElementNative(analyticsPo.targetNumber(pregnancyRegistrations));
    const pregnancyGoal = await helper.getTextFromElementNative(analyticsPo.targetGoal(pregnancyRegistrations));
    const pregnancyTitle = await helper.getTextFromElementNative(analyticsPo.targetTitle(pregnancyRegistrations));
    expect(pregnancyTitle).toBe('New pregnancies');
    expect(pregnancyCount).toBe('1');
    expect(pregnancyGoal).toBe('20');
    const activePregnancies = analyticsPo.targetById('active-pregnancies');
    await helper.waitUntilReadyNative(activePregnancies);
    const activeTitle = await helper.getTextFromElementNative(analyticsPo.targetTitle(activePregnancies));
    const activeCount = await helper.getTextFromElementNative(analyticsPo.targetNumber(activePregnancies));
    expect(activeTitle).toBe('Active pregnancies');
    expect(activeCount).toBe('1');
    await browser.get(utils.getBaseUrl() + 'contacts/' + pregnancyWoman._id);
    await helper.clickElementNative(contactsPage.newActions);
    await helper.clickElementNative(contactsPage.formById('pregnancy_home_visit'));
    await helper.waitUntilReadyNative(genericFormPo.formTitle);
    await formFiller(pregnancyVisitReport.build().fields, 'pregnancy_home_visit', chtPregnancyVisit.pages);
    await helper.waitUntilReadyNative(activePregnancyCard);
    [weeksPregnant, deliveryDate, ancVisit, lastVisit] = await contactsPage.cardChildrenValueArray(activePregnancyCard);
    expect(weeksPregnant).toBe('34');
    expect(deliveryDate).toBe(edd);
    expect(ancVisit).toBe('1 of 8');
    expect(lastVisit).toBe('today');
    await helper.waitElementToDisappearNative(commonElements.snackBarContent);
    await helper.clickElementNative(contactsPage.newActions);
    await helper.clickElementNative(contactsPage.formById('delivery'));
    await helper.waitUntilReadyNative(genericFormPo.formTitle);
    await formFiller(deliveryReport.build().fields, 'delivery', chtDelivery.pages);
    const pastPregnancyCard = await contactsPage.cardElementByHeaderText('Past pregnancy');
    await helper.waitUntilReadyNative(pastPregnancyCard);
    const [dateDelivered,
      placeOfDelivery,
      babiesDelivered,
      ancVisits] = await contactsPage.cardChildrenValueArray(pastPregnancyCard);
    const expectDeliveryDate = moment().format(dateFormat);
    expect(dateDelivered).toBe(expectDeliveryDate);
    expect(placeOfDelivery).toBe('Health facility');
    expect(babiesDelivered).toBe('1');
    expect(ancVisits).toBe('1');
    await commonElements.goToAnalytics();
    const liveBirths = analyticsPo.targetById('births-this-month');
    await helper.waitUntilReadyNative(liveBirths);
    const liveBirthsCount = await helper.getTextFromElementNative(analyticsPo.targetNumber(liveBirths));
    const liveBirthsTitle = await helper.getTextFromElementNative(analyticsPo.targetTitle(liveBirths));
    expect(liveBirthsCount).toBe('2');
    expect(liveBirthsTitle).toBe('Live births');
    const inFacilityDeliveries = analyticsPo.targetById('facility-deliveries');
    const inFacilityDeliveriesCount = await helper.getTextFromElementNative(
      analyticsPo.targetNumber(inFacilityDeliveries));
    const inFacilityDeliveriesTitle = await helper.getTextFromElementNative(
      analyticsPo.targetTitle(inFacilityDeliveries));
    expect(inFacilityDeliveriesCount).toBe('100% (1 of 1)');
    expect(inFacilityDeliveriesTitle).toBe('In-facility deliveries');
  });
});
