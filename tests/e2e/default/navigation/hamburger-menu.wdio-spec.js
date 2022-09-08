const commonPage = require('../../../page-objects/common/common.wdio.page');
const loginPage = require('../../../page-objects/login/login.wdio.page');

describe('Hamburger Menu tests', async () => {
  before(async () => {
    await loginPage.cookieLogin();
  });

  beforeEach(async () => {
    await commonPage.goToReports();
  });

  it('should open Configuration wizard', async () => {
    await commonPage.openHamburgerMenu();
    const actualProperties = await commonPage.openConfigurationWizardAndFetchProperties();
    expect(actualProperties).to.deep.equal({
      modelTitle: 'Configuration wizard',
      defaultCountryCode: 'Canada (+1)',
      modelFinishButtonText: 'Finish'
    });
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
    expect(actualProperties).to.deep.equal({
      modalHeader: 'Report bug',
      modelCancelButtonText: 'Cancel',
      modelSubmitButtonText: 'Submit'
    });
  });

  it('should open Configuration app', async () => {
    await commonPage.openHamburgerMenu();
    await commonPage.openAppManagement();
  });
});
