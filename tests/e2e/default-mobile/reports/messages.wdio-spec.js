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
const helperFunctions = require('../utils/helper-functions');

describe('Reports tab', () => {
  const places = placeFactory.generateHierarchy();
  const districtHospital = places.get('district_hospital');
  const healthCenter = places.get('health_center');
  const clinic = places.get('clinic');

  const onlineUserContact = personFactory.build({
    name: 'OnlineUser',
    phone: '+25475525749',
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });

  const onlineUser = userFactory.build({ place: healthCenter._id, roles: ['program_officer'], contact: onlineUserContact });

  const person = personFactory.build({
    _id: 'patient1',
    phone: '+25475525741',
    name: 'patient1',
    parent: { _id: clinic._id, parent: clinic.parent }
  });

  const report = pregnancyFactory.build({ contact: onlineUserContact, fields: { patient_id: person._id, case_id: 'case-12' } });

  before(async () => {
    await utils.saveDocs([...places.values(), person]);
    await utils.saveDocs([report]);
    await utils.createUsers([onlineUser]);
    await loginPage.login(onlineUser);
  });

  after(async () => await utils.revertSettings(true));

  it('should see option to send message', async () => {
    await helperFunctions.updateSettings(onlineUser);

    await commonElements.goToReports();
    const firstReport = await reportsPage.firstReport();
    await reportsPage.openSelectedReport(firstReport);
    // await commonElements.waitForPageLoaded();

    await browser.debug();
    // await browser.pause(900000)

    // const fabLabels = await commonElements.getFastActionItemsLabels();
    // const fabLabels = await commonElements.multipleActions();
    await commonElements.clickFastActionFAB({ waitForList: false });

    expect(fabLabels).to.include.members(['Edit facility', 'Send message', 'Fake']);
  });
});
