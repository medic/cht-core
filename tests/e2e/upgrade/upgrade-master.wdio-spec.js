const loginPage = require('@page-objects/default/login/login.wdio.page');
const upgradePage = require('@page-objects/upgrade/upgrade.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const aboutPage = require('@page-objects/default/about/about.wdio.page');
const constants = require('@constants');

const upgradeVersion = async () => {
  await upgradePage.goToUpgradePage();
  await upgradePage.expandPreReleasesAccordion();

  await (await upgradePage.getInstallButton('master')).click();
  await (await upgradePage.upgradeModalConfirm()).click();

  await (await upgradePage.cancelUpgradeButton()).waitForDisplayed();
  await (await upgradePage.deploymentInProgress()).waitForDisplayed();
  await (await upgradePage.deploymentInProgress()).waitForDisplayed({ reverse: true, timeout: 100000 });

  await (await upgradePage.deploymentComplete()).waitForDisplayed();
};


describe('Performing an upgrade from current branch to master', () => {
  it('should upgrade from current version to master', async () => {
    await loginPage.cookieLogin({
      username: constants.USERNAME,
      password: constants.PASSWORD,
      createUser: false
    });

    await upgradeVersion('master');

    expect(await upgradePage.getBuild()).to.include('alpha');
    await commonPage.goToAboutPage();
    await commonPage.waitForPageLoaded();
    await (await aboutPage.aboutCard()).waitForDisplayed();
    expect(await aboutPage.getVersion()).to.include('master');
  });
});
