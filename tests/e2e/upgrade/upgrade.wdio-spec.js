const utils = require('@utils');

const { BRANCH, TAG } = process.env;
const loginPage = require('@page-objects/default/login/login.wdio.page');
const upgradePage = require('@page-objects/upgrade/upgrade.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const adminPage = require('@page-objects/default/admin/admin.wdio.page');
const aboutPage = require('@page-objects/default/about/about.wdio.page');
const constants = require('@constants');
const version = require('../../../scripts/build/versions');
const dataFactory = require('@factories/cht/generate');

const docs = dataFactory.createHierarchy({
  name: 'offlineupgrade',
  user: true,
  nbrClinics: 1,
  nbrPersons: 1,
});


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

const getUpgradeLogs = async () => {
  const logs = await utils.logsDb.allDocs({
    startkey: 'upgrade_log',
    endkey: 'upgrade_log\ufff0',
    include_docs: true,
  });
  return logs.rows.map(row => row.doc);
};

const deleteUpgradeLogs = async () => {
  const logs = await getUpgradeLogs();
  logs.forEach(log => log._deleted = true);
  await utils.logsDb.bulkDocs(logs);
};

// ToDo: Remove once 4.4 is released. Because it needs selectors targeting the previous cht version.
const oldLogout = async () => {
  await commonPage.openHamburgerMenu();
  await (await commonPage.logoutButton()).waitForClickable();
  await (await commonPage.logoutButton()).click();
  $('.modal-dialog .modal-body').waitForDisplayed();
  const submitBtn = $('.modal-dialog a.btn.submit');
  await (await submitBtn).waitForClickable();
  await (await submitBtn).click();
  await browser.pause(100); // Wait for login page js to execute
};

// ToDo: Remove once 4.4 is released. Because it needs selectors targeting the previous cht version.
const oldCloseReloadModal = async () => {
  try {
    const reloadModalUpdate = $('#update-available [test-id="Update"]');
    await browser.waitUntil(async () => await (await reloadModalUpdate).waitForExist({ timeout: 5000 }));
    // Wait for the animation to complete
    await browser.pause(500);
    await (await reloadModalUpdate).click();
    await browser.pause(500);
    return true;
  } catch (err) {
    console.error('Reload modal not showed up');
    return false;
  }
};

describe('Performing an upgrade', () => {
  before(async () => {
    await utils.saveDocs([...docs.places, ...docs.clinics, ...docs.persons, ...docs.reports]);
    await utils.createUsers([docs.user]);

    await loginPage.login(docs.user);
    await oldLogout;

    await loginPage.cookieLogin({
      username: constants.USERNAME,
      password: constants.PASSWORD,
      createUser: false
    });
  });

  it('should have an upgrade_log after installing', async () => {
    const logs = await getUpgradeLogs();
    expect(logs.length).to.equal(1);
    expect(logs[0]).to.include({
      action: 'install',
      state: 'finalized',
    });
  });

  it('should upgrade to current branch', async () => {
    await upgradePage.goToUpgradePage();
    await upgradePage.expandPreReleasesAccordion();

    const installButton = await upgradePage.getInstallButton(BRANCH, TAG);
    await installButton.click();

    const confirm = await upgradePage.upgradeModalConfirm();
    await confirm.click();

    await (await upgradePage.cancelUpgradeButton()).waitForDisplayed();
    await (await upgradePage.deploymentInProgress()).waitForDisplayed();
    await (await upgradePage.deploymentInProgress()).waitForDisplayed({ reverse: true, timeout: 100000 });

    await (await upgradePage.deploymentComplete()).waitForDisplayed();

    const currentVersion = await upgradePage.getCurrentVersion();
    expect(version.getVersion(true)).to.include(currentVersion);

    await browser.refresh(); // load updated code of admin app
    await upgradePage.goToUpgradePage();
    const currentBuild = await upgradePage.getBuild();

    // there should be no staged ddocs
    const ddocs = await getDdocs();
    const staged = ddocs.filter(ddoc => ddoc._id.includes('staged'));
    expect(staged.length).to.equal(0);

    ddocs.forEach(ddoc => expect(ddoc.version).to.equal(currentBuild));

    const logs = await getUpgradeLogs();
    expect(logs.length).to.equal(2);
    expect(logs[1]).to.include({
      action: 'upgrade',
      state: 'finalized',
    });

    await adminPage.logout();
    await loginPage.login(docs.user);
    await oldCloseReloadModal();

    await commonPage.goToAboutPage();
    expect(await aboutPage.getVersion()).to.include(TAG ? TAG : `${BRANCH} (`);
    await commonPage.logout();
  });

  it('should display upgrade page even without upgrade logs', async () => {
    await loginPage.cookieLogin({
      username: constants.USERNAME,
      password: constants.PASSWORD,
      createUser: false
    });

    await deleteUpgradeLogs();

    await upgradePage.goToUpgradePage();

    const currentVersion = await upgradePage.getCurrentVersion();
    expect(version.getVersion(true)).to.include(currentVersion);
    expect((await getUpgradeLogs()).length).to.equal(0);
    await (await upgradePage.deploymentInProgress()).waitForDisplayed({ reverse: true });
  });
});
