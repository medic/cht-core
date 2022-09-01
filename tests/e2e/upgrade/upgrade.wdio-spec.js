const utils = require('../../utils');

const { BRANCH, BUILD_NUMBER } = process.env;
const loginPage = require('../../page-objects/login/login.wdio.page');
const upgradePage = require('../../page-objects/upgrade/upgrade.wdio.page');

const getDdocs = async () => {
  const result = await utils.requestOnMedicDb({
    path: '/_all_docs',
    qs: {
      start_key: JSON.stringify('_design'),
      end_key: JSON.stringify('_design\ufff0'),
      include_docs: true,
    },
  });

  return result.rows.map(row => row.doc);
};

describe('Performing an upgrade', () => {
  before(async () => {
    await loginPage.cookieLogin({ ...auth, createUser: false });
  });

  it('should upgrade to current branch', async () => {
    await upgradePage.goToUpgradePage();
    await upgradePage.expandPreReleasesAccordion();

    const installButton = await upgradePage.getInstallButton(BRANCH);
    await installButton.click();

    const confirm = await upgradePage.upgradeModalConfirm();
    await confirm.click();

    await (await upgradePage.cancelUpgradeButton()).waitForDisplayed();
    await (await upgradePage.deploymentInProgress()).waitForDisplayed();
    await (await upgradePage.deploymentInProgress()).waitForDisplayed({ reverse: true, timeout: 100000 });

    await (await upgradePage.deploymentComplete()).waitForDisplayed();

    const currentVersion = await upgradePage.getCurrentVersion();
    // todo what happens when tags are pushed?
    expect(currentVersion).to.include(`${BRANCH}.${BUILD_NUMBER}`);

    // there should be no staged ddocs
    const ddocs = await getDdocs();
    const staged = ddocs.filter(ddoc => ddoc._id.includes('staged'));
    expect(staged.length).to.equal(0);

    ddocs.forEach(ddoc => expect(ddoc.version).to.equal(currentVersion));
  });
});
