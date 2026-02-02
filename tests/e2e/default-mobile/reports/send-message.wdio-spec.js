const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const pregnancyFactory = require('@factories/cht/reports/pregnancy');
const { CONTACT_TYPES } = require('@medic/constants');

describe('Report - Send message action', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get(CONTACT_TYPES.HEALTH_CENTER);
  const clinic = places.get('clinic');

  const chwContact = personFactory.build({
    phone: '+25475525759',
    parent: { _id: clinic._id, parent: clinic.parent }
  });

  const onlineUser = userFactory.build({
    place: healthCenter._id,
    roles: ['program_officer'],
  });

  const person = personFactory.build({
    phone: '+25475525741',
    parent: { _id: clinic._id, parent: clinic.parent }
  });

  const report = pregnancyFactory.build({
    contact: chwContact,
    fields: { patient_id: person._id, case_id: 'case-12' }
  });

  before(async () => {
    await utils.saveDocs([...places.values(), person, chwContact, report]);
    await utils.createUsers([onlineUser]);
    await loginPage.login(onlineUser);
  });

  it('should display option to send message', async () => {
    await commonPage.goToReports();
    const firstReport = await reportsPage.leftPanelSelectors.firstReport();
    await reportsPage.openSelectedReport(firstReport);

    expect(await commonPage.isReportActionDisplayed()).to.equal(true);
    expect(await commonPage.fabSelectors.reportsFastActionFAB().getAttribute('class'))
      .to.include('fa-envelope');
  });
});
