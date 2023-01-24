const moment = require('moment');

const utils = require('../../../utils');
const commonElements = require('../../../page-objects/default/common/common.wdio.page');
const reportsPage = require('../../../page-objects/default/reports/reports.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const userFactory = require('../../../factories/cht/users/users');
const placeFactory = require('../../../factories/cht/contacts/place');
const personFactory = require('../../../factories/cht/contacts/person');
const reportFactory = require('../../../factories/cht/reports/generic-report');

describe('Reports Sidebar Filter', () => {
  let savedReports;
  const parent = placeFactory.place().build({ _id: 'dist1', type: 'district_hospital' });
  const user = userFactory.build();
  const patient = personFactory.build({ parent: { _id: user.place._id, parent: { _id: parent._id } } });

  const today = moment();
  const reports = [
    reportFactory.build(
      {
        form: 'P',
        reported_date: moment([today.year(), today.month(), 1, 23, 30]).subtract(4, 'month').valueOf()
      },
      { patient, submitter: user.contact, fields: { lmp_date: 'Feb 3, 2022' }}
    ),
    reportFactory.build(
      {
        form: 'P',
        reported_date: moment([today.year(), today.month(), 12, 10, 30]).subtract(1, 'month').valueOf()
      },
      { patient, submitter: user.contact, fields: { lmp_date: 'Feb 16, 2022' }}
    ),
    reportFactory.build(
      {
        form: 'V',
        reported_date: moment([today.year(), today.month(), 15, 0, 30]).subtract(5, 'month').valueOf()
      },
      { patient, submitter: user.contact, fields: { ok: 'Yes!' }}
    ),
    reportFactory.build(
      {
        form: 'V',
        reported_date: moment([today.year(), today.month(), 16, 9, 10]).subtract(1, 'month').valueOf()
      },
      { patient, submitter: user.contact, fields: { ok: 'Yes!' }}
    ),
  ];

  beforeEach(async () => {
    const results = await utils.saveDocs([ parent, patient, ...reports ]);
    results.splice(0, 2); // Keeping only reports
    savedReports = results.map(result => result.id);

    await utils.createUsers([ user ]);
    await loginPage.login(user);
    await commonElements.waitForPageLoaded();
    await commonElements.goToReports();
  });

  it('should filter by date', async () => {
    await (await reportsPage.firstReport()).waitForDisplayed();
    await reportsPage.openSidebarFilter();

    await reportsPage.openSidebarFilterDateAccordion();
    await reportsPage.setSidebarFilterFromDate();
    await reportsPage.setSidebarFilterToDate();

    await commonElements.waitForPageLoaded();
    const allReports = await reportsPage.allReports();

    expect(allReports.length).to.equal(2);
    expect(await (await reportsPage.reportsByUUID(savedReports[1])).length).to.equal(1);
    expect(await (await reportsPage.reportsByUUID(savedReports[3])).length).to.equal(1);
  });
});

