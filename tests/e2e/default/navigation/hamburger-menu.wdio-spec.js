const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');

describe('Hamburger Menu tests', async () => {
  before(async () => {
    await loginPage.cookieLogin();
  });

  beforeEach(async () => {
    await commonPage.goToReports();
  });

  it('should open About', async () => {
    await commonPage.openHamburgerMenu();
    await commonPage.openAboutMenu();
  });

  it('should open User settings', async () => {
    await commonPage.openHamburgerMenu();
    await commonPage.openUserSettingsAndFetchProperties();
  });

  it('should open Report bug', async () => {
    await commonPage.openHamburgerMenu();
    const actualProperties = await commonPage.openReportBugAndFetchProperties();
    expect(actualProperties.header).to.equal('Report bug');
    await commonPage.closeReportBug();
  });

  it('should open Configuration app', async () => {
    await commonPage.openHamburgerMenu();
    await commonPage.openAppManagement();
  });
});
