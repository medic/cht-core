const moment = require('moment');
const utils = require('@utils');
const analyticsPage = require('@page-objects/default/analytics/analytics.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const reportPage = require('@page-objects/default/reports/reports.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const deliveryForm = require('@page-objects/default/enketo/delivery.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const pregnancyForm = require('@page-objects/default/enketo/pregnancy.wdio.page');

describe('Contact Delivery Form', () => {
  const BABY_NAME = 'Benja';
  const BABY_DOB = moment().format('YYYY-MM-DD');
  const BABY_SEX = 'male';

  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const offlineUser = userFactory.build({ place: healthCenter._id, roles: ['chw'] });
  const pregnantWoman = personFactory.build({
    date_of_birth: moment().subtract(25, 'years').format('YYYY-MM-DD'),
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });

  before(async () => {
    await utils.saveDocs([...places.values(), pregnantWoman]);
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);
    await commonPage.waitForPageLoaded();
    await commonPage.hideSnackbar();
    await commonPage.goToPeople(pregnantWoman._id);

    await pregnancyForm.submitPregnancy();
    await commonPage.waitForPageLoaded();
  });

  it('Complete a delivery: Process a delivery with a live child and facility birth.', async () => {
    await commonPage.openFastActionReport('delivery');
    await deliveryForm.selectDeliveryConditionWomanOutcome('alive_well');
    await genericForm.nextPage();
    await deliveryForm.selectDeliveryPostnatalDangerSignsFever('no');
    await deliveryForm.selectDeliveryPostnatalDangerSevereHeadache('no');
    await deliveryForm.selectDeliveryPostnatalDangerVaginalBleeding('no');
    await deliveryForm.selectDeliveryPostnatalDangerVaginalDischarge('no');
    await deliveryForm.selectDeliveryPostnatalDangerConvulsion('no');
    await genericForm.nextPage();
    await deliveryForm.selectDeliveryOutcomeBabiesDelivered('1');
    await deliveryForm.selectDeliveryOutcomeBabiesAlive('1');
    await deliveryForm.selectDeliveryOutcomeDeliveryPlace('health_facility');
    await deliveryForm.selectDeliveryOutcomeDeliveryMode('vaginal');
    await deliveryForm.setDeliveryOutcomeDateOfDelivery(BABY_DOB);
    await genericForm.nextPage();
    await deliveryForm.selectDeliveryBabyCondition('alive_well');
    await deliveryForm.setDeliveryBabyName(BABY_NAME);
    await deliveryForm.selectDeliveryBabySex(BABY_SEX);
    await deliveryForm.selectDeliveryBabyBirthWeightKnown('no');
    await deliveryForm.selectDeliveryBabyBirthLengthKnown('no');
    await deliveryForm.selectDeliveryBabyVaccinesReceived('none');
    await deliveryForm.selectDeliveryBabyBreastfeeding('yes');
    await deliveryForm.selectDeliveryBabyBreastfeedingWithin1Hour('yes');
    await deliveryForm.selectDeliveryBabyInfectedUmbilicalCord('no');
    await deliveryForm.selectDeliveryBabyConvulsion('no');
    await deliveryForm.selectDeliveryBabyDifficultyFeeding('no');
    await deliveryForm.selectDeliveryBabyVomit('no');
    await deliveryForm.selectDeliveryBabyDrowsy('no');
    await deliveryForm.selectDeliveryBabyStiff('no');
    await deliveryForm.selectDeliveryBabyYellowSkin('no');
    await deliveryForm.selectDeliveryBabyFever('no');
    await deliveryForm.selectDeliveryBabyBlueSkin('no');
    await genericForm.nextPage();
    await genericForm.nextPage();
    await deliveryForm.selectDeliveryPncVisits('none');
    await genericForm.nextPage();

    const summaryInfo = await deliveryForm.getSummaryInfo();
    expect(summaryInfo.patientName).to.equal(pregnantWoman.name);
    expect(summaryInfo.patientAge).to.equal('25');
    expect(summaryInfo.womanCondition).to.equal('Alive and well');
    expect(summaryInfo.deliveryDate).to.equal(BABY_DOB);
    expect(summaryInfo.deliveryPlace).to.equal('Health facility');
    expect(summaryInfo.deliveredBabies).to.equal('1');
    expect(summaryInfo.deceasedBabies).to.equal('0');
    expect(summaryInfo.pncVisits).to.equal('None');

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();

    await contactPage.openReport();
    await (await reportPage.reportBodyDetails()).waitForDisplayed();
    const { patientName, reportName } = await reportPage.getOpenReportInfo();
    expect(patientName).to.equal(pregnantWoman.name);
    expect(reportName).to.equal('Delivery');
  });

  it('The past pregnancy card should show', async () => {
    await commonPage.goToPeople(pregnantWoman._id);
    await contactPage.getContactCardTitle();
    expect((await contactPage.getContactCardTitle())).to.equal('Past pregnancy');
  });

  it('The child registered during birth should be created and should display the proper information', async () => {
    await contactPage.selectLHSRowByText(BABY_NAME);
    expect((await contactPage.getContactInfoName())).to.equal(BABY_NAME);
    expect((await contactPage.getContactSummaryField('contact.sex')).toLocaleUpperCase())
      .to.equal(BABY_SEX.toLocaleUpperCase());
  });

  it('The targets page should be updated', async () => {
    await commonPage.goToAnalytics();
    await analyticsPage.goToTargets();
    const targets = await analyticsPage.getTargets();

    expect(targets).to.have.deep.members([
      { title: 'Deaths', goal: '0', count: '0' },
      { title: 'New pregnancies', goal: '20', count: '1' },
      { title: 'Live births', count: '1' },
      { title: 'Active pregnancies', count: '0' },
      { title: 'Active pregnancies with 1+ routine facility visits', count: '0' },
      { title: 'In-facility deliveries', percent: '100%', percentCount: '(1 of 1)' },
      { title: 'Active pregnancies with 4+ routine facility visits', count: '0' },
      { title: 'Active pregnancies with 8+ routine contacts', count: '0' },
    ]);
  });
});
