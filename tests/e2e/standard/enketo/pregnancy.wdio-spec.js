const moment = require('moment');
const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const gatewayApiUtils = require('@utils/gateway-api');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const contactPage = require('@page-objects/standard/contacts/contacts.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const analyticsPage = require('@page-objects/default/analytics/analytics.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const pregnancyForm = require('@page-objects/standard/enketo/pregnancy.wdio.page');

describe('New pregnancy', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const user = userFactory.build({ place: healthCenter._id, roles: ['district_admin'] });
  const pregnantWoman1 = 'Woman1';
  const pregnantWoman2 = 'Woman2';

  before(async () => {
    await utils.saveDocs([...places.values()]);
    await utils.createUsers([user]);
    await loginPage.cookieLogin();
  });

  it('should create required persons', async () => {
    await commonPage.goToPeople(healthCenter._id);

    // Create Woman1 - webapp
    await contactPage.contactPageDefault.addPerson({
      name: pregnantWoman1,
      dob: moment().subtract(25, 'years').format('YYYY-MM-DD')
    });
    await commonPage.waitForPageLoaded();
    await sentinelUtils.waitForSentinel();

    // Create Woman2 - SMS N form
    await commonPage.goToPeople(healthCenter._id);
    await contactPage.contactPageDefault.addPerson({
      name: pregnantWoman2,
      dob: moment().subtract(25, 'years').format('YYYY-MM-DD')
    });
    await commonPage.waitForPageLoaded();
    await sentinelUtils.waitForSentinel();
  });

  it('Submit new pregnancy - Woman1 - webapp', async () => {
    const note = 'Test note - pregnant woman';
    await commonPage.goToPeople(healthCenter._id);
    await contactPage.contactPageDefault.selectLHSRowByText(pregnantWoman1);
    const medicIDW1 = await contactPage.contactPageDefault.getContactMedicID();
    await contactPage.contactPageDefault.createNewAction('New Pregnancy');

    await pregnancyForm.selectKnowLMP();
    await pregnancyForm.selectAproxLMP(pregnancyForm.APROX_LMP.b7To8Months);

    expect(await (await pregnancyForm.getEstDeliveryDate()).isDisplayed()).to.be.true;

    await genericForm.nextPage();
    const riskFactors = await pregnancyForm.selectAllRiskFactors();
    await genericForm.nextPage();
    const dangerSigns = await pregnancyForm.selectAllDangerSigns();
    await genericForm.nextPage();
    await pregnancyForm.setNote(note);
    await genericForm.nextPage();

    expect((await pregnancyForm.riskFactorsSummary()).length).to.equal(riskFactors.length);
    expect((await pregnancyForm.dangerSignsSummary()).length).to.equal(dangerSigns.length);
    const followUpSMS = await pregnancyForm.getFollowUpSMS();
    expect(followUpSMS).to.include(pregnantWoman1);
    expect(followUpSMS).to.include(medicIDW1);
    expect(followUpSMS).to.include(note);

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();

    expect(await (await contactPage.pregnancyCard()).isDisplayed()).to.be.true;
    expect(await contactPage.getPregnancyCardRisk()).to.equal('High risk');

    // Verify the created report
    await commonPage.goToReports();
    const firstReport = await reportsPage.firstReport();
    const firstReportInfo = await reportsPage.getListReportInfo(firstReport);

    expect(firstReportInfo.heading).to.equal(pregnantWoman1);
    expect(firstReportInfo.form).to.equal('New Pregnancy');

    await reportsPage.openSelectedReport(firstReport);
    await commonPage.waitForPageLoaded();
    expect(await (await reportsPage.reportTasks()).isDisplayed()).to.be.true;
    expect((await reportsPage.getTaskDetails(1, 1)).state).to.contain('scheduled');
  });

  it('Submit new pregnancy - Woman2 - SMS P form', async () => {
    await commonPage.goToPeople();
    await contactPage.contactPageDefault.selectLHSRowByText(pregnantWoman2);
    const medicIDW2 = await contactPage.contactPageDefault.getContactMedicID();

    const messageValue = `P ${medicIDW2} 27`;
    await gatewayApiUtils.api.postMessage({
      id: 'P-id',
      from: user.phone,
      content: messageValue
    });

    await browser.refresh();
    await commonPage.waitForPageLoaded();
    expect(await (await contactPage.pregnancyCard()).isDisplayed()).to.be.true;
    expect(await contactPage.getPregnancyCardRisk()).to.equal('Normal');

    // Verify the created report
    await commonPage.goToReports();
    const firstReport = await reportsPage.firstReport();
    const firstReportInfo = await reportsPage.getListReportInfo(firstReport);

    await reportsPage.openSelectedReport(firstReport);
    await commonPage.waitForPageLoaded();

    expect(firstReportInfo.heading).to.equal('Woman2');
    expect(firstReportInfo.form).to.equal('New Pregnancy (SMS)');
    expect(await (await reportsPage.reportTasks()).isDisplayed()).to.be.true;
    expect((await reportsPage.getTaskDetails(1, 1)).state).to.contain('scheduled');
  });

  it('Verify the targets page', async () => {
    await commonPage.logout();
    await loginPage.login(user);
    await commonPage.waitForPageLoaded();
    await commonPage.goToAnalytics();
    const targets = await analyticsPage.getTargets();

    expect(targets).to.have.deep.members([
      { title: 'Active pregnancies', count: '2' },
      { title: 'New pregnancies', count: '2' },
      { title: 'Births', count: '0' },
      { title: 'Deliveries with 1+ visit', percent: '0%', percentCount: '(0 of 0)' },
      { title: 'Deliveries with 4+ visits', percent: '0%', percentCount: '(0 of 0)' },
      { title: 'Deliveries at facility', percent: '0%', percentCount: '(0 of 0)' },
      { title: '<5 children screened for growth monitoring', percent: '0%', percentCount: '(0 of 0)' },
      { title: '<5 Underweight Growth Monitoring', count: '0' },
      { title: 'Active MAM cases', count: '0' },
      { title: 'Active SAM cases', count: '0' },
      { title: 'Active OTP cases', count: '0' },
      { title: 'Active SFP cases', count: '0' }
    ]);
  });

});
