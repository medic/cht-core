const common = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const peoplePage = require('@page-objects/default/contacts/contacts.wdio.page');
const utils = require('@utils');

const loginPage = require('@page-objects/default/login/login.wdio.page');
const constants = require('@constants');

const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const genericReportFactory = require('@factories/cht/reports/generic-report');

describe.skip('Webapp after upgrade', () => {
  const district = placeFactory.place().build({
    _id: 'parent',
    type: 'district_hospital',
    name: 'DC',
  });

  const contact = personFactory.build({
    _id: 'contact',
    name: 'John',
    parent: { _id: 'district' },
  });

  const report = genericReportFactory.report().build({ form: 'someform' }, { patient: contact, submitter: contact });

  before(async () => {
    await utils.saveDocs([district, contact, report]);
  });

  after(async () => {
    await utils.revertDb([/^form:/], true);
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

});
