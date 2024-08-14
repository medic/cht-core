const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const loginPage = require('@page-objects/default/login/login.wdio.page');
// const commonPage = require('@page-objects/default/common/common.wdio.page');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const sentinelUtils = require('@utils/sentinel');
const pregnancyFactory = require('@factories/cht/reports/pregnancy');


describe('Reports tab', () => {
  const places = placeFactory.generateHierarchy();
  const districtHospital = places.get('district_hospital');
  const healthCenter = places.get('health_center');
  const clinic = places.get('clinic');

  const offlineUserContact = personFactory.build({
    name: 'OfflineUser',
    phone: '+25474425741',
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });

  const offlineUser = userFactory.build({ place: healthCenter._id, roles: ['chw'], contact: offlineUserContact });

  const person = personFactory.build({
    _id: 'patient1',
    phone: '+14152223344',
    name: 'patient1',
    parent: { _id: clinic._id, parent: clinic.parent }
  });

  const report = pregnancyFactory.build({ contact: offlineUserContact, fields: { patient_id: person._id, case_id: 'case-12' } });

  before(async () => {
    //await utils.updateSettings(appSettings.WITH_SMS_FORMS, true);
    await utils.saveDocs([...places.values(), person]);
    await utils.saveDocs([report]);
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);
  });

  after(async () => await utils.revertSettings(true));

  afterEach(async () => await utils.deleteAllDocs([/^form:/].concat(...places.values()).concat(person._id)));

  it('should see option to send message', async () => {
    await sentinelUtils.waitForSentinel([report._id]);

    await commonElements.goToReports();
    const firstReport = await reportsPage.firstReport();
    await reportsPage.openSelectedReport(firstReport);
    // await commonElements.waitForPageLoaded();

    await browser.pause(900000)

    // const fabLabels = await commonElements.getFastActionItemsLabels();
    // const fabLabels = await commonElements.multipleActions();
    await commonElements.clickFastActionFAB({ waitForList: false });

    expect(fabLabels).to.include.members(['Edit facility', 'Send message', 'Fake']);

    // await browser.pause(480000)

    // await verifyListReportContent({ formName: 'REF_REF' });
    // await verifyOpenReportContent({ formName: 'REF_REF', subject: person.name });

    // await browser.pause(480000)
  });
});
