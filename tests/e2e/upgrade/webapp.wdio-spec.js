const common = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const peoplePage = require('@page-objects/default/contacts/contacts.wdio.page');
const utils = require('@utils');

const { BRANCH, TAG } = process.env;

const loginPage = require('@page-objects/default/login/login.wdio.page');
const upgradePage = require('@page-objects/upgrade/upgrade.wdio.page');
const constants = require('@constants');

const docs = [
  {
    _id: 'parent',
    type: 'district_hospital',
    name: 'DC',
  },
  {
    _id: 'contact',
    type: 'person',
    name: 'John',
    parent: { _id: 'parent' },
  },
  {
    _id: 'report',
    type: 'data_record',
    form: 'someform',
    contact: { _id: 'contact', parent: { _id: 'parent' } },
    fields: {
      whatever: 1,
    },
    reported_date: Date.now(),
  },
];

describe('Webapp after upgrade', () => {
  before(async () => {
    await utils.saveDocs(docs);
  });

  it('should login with admin account', async () => {
    await loginPage.login({ username: constants.USERNAME, password: constants.PASSWORD, adminApp: true });
  });

  it('report page should display one report', async () => {
    await common.goToReports();
    const reports = await reportsPage.getAllReportsText();
    expect(reports).to.deep.equal(['John']);
  });

  it('contacts page should display one contact', async () => {
    await common.goToPeople();

    const contacts = await peoplePage.getAllLHSContactsNames();
    expect(contacts).to.deep.equal(['DC']);
  });

  it('should display correct version on the about page', async () => {
    await common.goToAboutPage();
    expect(await upgradePage.getCurrentVersion()).to.include(TAG ? TAG : `${BRANCH} (`);
  });
});
