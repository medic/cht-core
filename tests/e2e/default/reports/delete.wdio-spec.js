const moment = require('moment');

const userFactory = require('../../../factories/cht/users/users');
const placeFactory = require('../../../factories/cht/contacts/place');
const personFactory = require('../../../factories/cht/contacts/person');
const reportFactory = require('../../../factories/cht/reports/generic-report');
const commonElements = require('../../../page-objects/default/common/common.wdio.page');
const reportsPage = require('../../../page-objects/default/reports/reports.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const utils = require('../../../utils');

describe('Delete Reports', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const onlineUser = userFactory.build({ place: healthCenter._id, roles: ['program_officer'] });
  const patient = personFactory.build({ parent: { _id: healthCenter._id, parent: healthCenter.parent } });
  const today = moment();
  const reports = [
    reportFactory.build(
      { form: 'P', reported_date: moment([today.year(), today.month() - 4, 1, 23, 30]).valueOf() },
      { patient, submitter: onlineUser.contact, fields: { lmp_date: 'Feb 3, 2022' } },
    ),
    reportFactory.build(
      { form: 'P', reported_date: moment([today.year(), today.month() - 1, 16, 0, 30]).valueOf() },
      { patient, submitter: onlineUser.contact, fields: { lmp_date: 'Feb 16, 2022' } },
    ),
  ];

  const savedReportIds = [];
  beforeEach(async () => {
    await utils.saveDocs([ ...places.values(), patient ]);
    (await utils.saveDocs(reports)).forEach(savedReport => savedReportIds.push(savedReport.id));
    await utils.createUsers([ onlineUser ]);
    await loginPage.login(onlineUser);
    await commonElements.waitForPageLoaded();
    await commonElements.goToReports();
  });

  it('Should delete report', async () => {
    await (await reportsPage.firstReport()).waitForDisplayed();

    expect(await (await reportsPage.reportByUUID(savedReportIds[0])).isDisplayed()).to.be.true;
    expect(await (await reportsPage.reportByUUID(savedReportIds[1])).isDisplayed()).to.be.true;

    await reportsPage.openReport(savedReportIds[1]);
    await reportsPage.deleteReport();
    await commonElements.goToReports();

    expect(await (await reportsPage.reportByUUID(savedReportIds[0])).isDisplayed()).to.be.true;
    expect(await (await reportsPage.reportByUUID(savedReportIds[1])).isDisplayed()).to.be.true;
  });
});
