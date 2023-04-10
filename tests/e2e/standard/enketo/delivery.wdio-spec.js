const moment = require('moment');
const utils = require('../../../utils');
const gatewayApiUtils = require('../../../gateway-api.utils');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const placeFactory = require('../../../factories/cht/contacts/place');
const userFactory = require('../../../factories/cht/users/users');
const contactPage = require('../../../page-objects/standard/contacts/contacts.wdio.page');
const reportsPage = require('../../../page-objects/default/reports/reports.wdio.page');
const analyticsPage = require('../../../page-objects/default/analytics/analytics.wdio.page');
const genericForm = require('../../../page-objects/default/enketo/generic-form.wdio.page');
const pregnancyForm = require('../../../page-objects/standard/enketo/pregnancy.wdio.page');
const pregnancyVisitForm = require('../../../page-objects/standard/enketo/pregnancy-visit.wdio.page');
const deliveryForm = require('../../../page-objects/standard/enketo/delivery.wdio.page');

describe('Delivery', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const user = userFactory.build({ place: healthCenter._id, roles: ['district_admin'] });
  const pregnantWoman1 = 'Woman1';
  const pregnantWoman2 = 'Woman2';

  before(async () => {
    await utils.saveDocs([...places.values()]);
    await utils.createUsers([user]);
    await loginPage.cookieLogin();
    await commonPage.goToPeople(healthCenter._id);

    //Create Woman1
    await contactPage.contactPageDefault.addPerson({
      name: pregnantWoman1,
      dob: moment().subtract(25, 'years').format('YYYY-MM-DD') }
    );

    // Submit new pregnancy for Woman1
    await pregnancyForm.submitPregnancy();
    await commonPage.waitForPageLoaded();

    // Submit 4 pregnancy visits for Woman1 to see the update in the targets
    for (let i = 0; i < 4; i++) {
      await pregnancyVisitForm.submitPregnancyVisit();
      await commonPage.waitForPageLoaded();
    }

    // Create Woman2
    await commonPage.goToPeople(healthCenter._id);
    await contactPage.contactPageDefault.addPerson({
      name: pregnantWoman2,
      dob: moment().subtract(25, 'years').format('YYYY-MM-DD') }
    );


    // Submit new pregnancy for Woman2
    await pregnancyForm.submitPregnancy();
    await commonPage.waitForPageLoaded();

    // Submit 1 pregnancy visit for Woman2 to see the update in the targets
    await pregnancyVisitForm.submitPregnancyVisit();
    await commonPage.waitForPageLoaded();

  });

  it('Delivery - Woman1 - webapp', async () => {
    const note = 'Test note - pregnant woman';
    await commonPage.goToPeople(healthCenter._id);
    await contactPage.contactPageDefault.selectLHSRowByText(pregnantWoman1);
    await commonPage.waitForPageLoaded();
    const medicIDW1 = await contactPage.contactPageDefault.getContactMedicID();
    await commonPage.openFastActionReport('delivery');

    const pregnancyOutcome = await deliveryForm.selectPregnancyOutcome();
    const locationDelivery = await deliveryForm.selectDeliveryLocation();
    await deliveryForm.setDeliveryDate(moment().format('YYYY-MM-DD'));
    await genericForm.nextPage();
    await deliveryForm.setNote(note);
    await genericForm.nextPage();

    expect(await deliveryForm.getOutcomeSummary()).to.equal(pregnancyOutcome);
    expect(await deliveryForm.getLocationSummary()).to.equal(locationDelivery);
    const followUpSMS = await deliveryForm.getFollowUpSMS();
    expect(followUpSMS).to.include(pregnantWoman1);
    expect(followUpSMS).to.include(medicIDW1);
    expect(followUpSMS).to.include(note);

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();

    expect(await (await contactPage.pastPregnancyCard()).isDisplayed()).to.be.true;
    expect(await contactPage.getDeliveryCode()).to.equal('Facility birth');
    const visits = (await contactPage.getAncVisits()).split(' of ')[0];
    expect(visits).to.equal('4');

    // Verify the created report
    await commonPage.goToReports();
    const firstReport = await reportsPage.firstReport();
    const firstReportInfo = await reportsPage.getListReportInfo(firstReport);

    expect(firstReportInfo.heading).to.equal(pregnantWoman1);
    expect(firstReportInfo.form).to.equal('Delivery');

    await reportsPage.openSelectedReport(firstReport);
    await commonPage.waitForPageLoaded();
    expect(await (await reportsPage.reportTasks()).isDisplayed()).to.be.true;
    expect((await reportsPage.getTaskDetails(1, 1)).state).to.contain('scheduled');
  });

  it('Delivery - Woman2 - SMS D form', async () => {
    await commonPage.goToPeople(healthCenter._id);
    await contactPage.contactPageDefault.selectLHSRowByText(pregnantWoman2);
    await commonPage.waitForPageLoaded();
    const medicIDW2 = await contactPage.contactPageDefault.getContactMedicID();

    await gatewayApiUtils.api.postMessage({
      id: 'D-id',
      from: user.phone,
      content: `D ${medicIDW2} F 1`
    });

    await browser.refresh();
    await commonPage.waitForPageLoaded();
    expect(await (await contactPage.pastPregnancyCard()).isDisplayed()).to.be.true;
    expect(await contactPage.getDeliveryCode()).to.equal('Facility birth');
    const visits = (await contactPage.getAncVisits()).split(' of ')[0];
    expect(visits).to.equal('0');

    // Verify the created report
    await commonPage.goToReports();
    const firstReport = await reportsPage.firstReport();
    const firstReportInfo = await reportsPage.getListReportInfo(firstReport);

    expect(firstReportInfo.heading).to.equal(pregnantWoman2);
    expect(firstReportInfo.form).to.equal('Delivery Report (SMS)');

    await reportsPage.openSelectedReport(firstReport);
    await commonPage.waitForPageLoaded();
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
      { title: 'Active pregnancies', count: '0' },
      { title: 'New pregnancies', count: '2' },
      { title: 'Births', count: '2' },
      { title: 'Deliveries with 1+ visit', percent: '100%', percentCount: '(2 of 2)' },
      { title: 'Deliveries with 4+ visits', percent: '50%', percentCount: '(1 of 2)' },
      { title: 'Deliveries at facility', percent: '100%', percentCount: '(2 of 2)' },
      { title: '<5 children screened for growth monitoring', percent: '0%', percentCount: '(0 of 0)' },
      { title: '<5 Underweight Growth Monitoring', count: '0' },
      { title: 'Active MAM cases', count: '0' },
      { title: 'Active SAM cases', count: '0' },
      { title: 'Active OTP cases', count: '0' },
      { title: 'Active SFP cases', count: '0' }
    ]);
  });
});
