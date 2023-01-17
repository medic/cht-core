const moment = require('moment');

const utils = require('../../../utils');
const commonElements = require('../../../page-objects/default/common/common.wdio.page');
const reportsTab = require('../../../page-objects/default/reports/reports.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const userFactory = require('../../../factories/cht/users/users');
const placeFactory = require('../../../factories/cht/contacts/place');
const personFactory = require('../../../factories/cht/contacts/person');
const reportFactory = require('../../../factories/cht/reports/generic-report');


describe('Report Filter', () => {
  let savedReports;
  const parent = placeFactory.place().build({ _id: 'dist1', type: 'district_hospital' });
  const user = userFactory.build();
  const patient = personFactory.build({ parent: { _id: user.place._id, parent: { _id: parent._id } } });
  const reports = [
    // one registration half an hour before the start date
    reportFactory.build(
      { form: 'P', reported_date: moment([2016, 4, 15, 23, 30]).valueOf() },
      { patient, submitter: user.contact, fields: { lmp_date: 'Feb 3, 2016' } }
    ),
    // one registration half an hour after the start date
    reportFactory.build(
      { form: 'P', reported_date: moment([2016, 4, 16, 0, 30]).valueOf() },
      { patient, submitter: user.contact, fields: { lmp_date: 'Feb 15, 2016' } }
    ),
    // one visit half an hour after the end date
    reportFactory.build(
      { form: 'V', reported_date: moment([2016, 4, 18, 0, 30]).valueOf() },
      { patient, submitter: user.contact, fields: { ok: 'Yes!' } }
    ),
    // one visit half an hour before the end date
    reportFactory.build(
      { form: 'V', reported_date: moment([2016, 4, 17, 23, 30]).valueOf() },
      { patient, submitter: user.contact, fields: { ok: 'Yes!' } }
    ),
  ];

  beforeEach(async () => {
    const settings = await utils.getSettings();
    const permissions = {
      ...settings.permissions,
      can_view_old_filter_and_search: [ 'chw' ]
    };
    await utils.updateSettings({ permissions }, true);

    const results = await utils.saveDocs([ parent, patient, ...reports ]);
    results.splice(0, 2); // Keeping only reports
    savedReports = results.map(result => result.id);

    await utils.createUsers([ user ]);
    await loginPage.login(user);
    await commonElements.waitForPageLoaded();
    await commonElements.goToReports();
  });

  it('should filter by date', async () => {
    await (await reportsTab.firstReport()).waitForDisplayed();

    await reportsTab.filterByDate(moment('05/16/2016', 'MM/DD/YYYY'), moment('05/17/2016', 'MM/DD/YYYY'));
    await commonElements.waitForPageLoaded();
    const allReports = await reportsTab.allReports();

    expect(allReports.length).to.equal(2);
    expect(await (await reportsTab.reportsByUUID(savedReports[1])).length).to.equal(1);
    expect(await (await reportsTab.reportsByUUID(savedReports[3])).length).to.equal(1);
  });
});

