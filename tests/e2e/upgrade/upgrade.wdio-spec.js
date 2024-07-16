const utils = require('@utils');

const { BRANCH, TAG, BASE_VERSION } = process.env;
const loginPage = require('@page-objects/default/login/login.wdio.page');
const upgradePage = require('@page-objects/upgrade/upgrade.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const adminPage = require('@page-objects/default/admin/admin.wdio.page');
const aboutPage = require('@page-objects/default/about/about.wdio.page');
const constants = require('@constants');
const version = require('../../../scripts/build/versions');
const dataFactory = require('@factories/cht/generate');
const semver = require('semver');

const testFrontend = BASE_VERSION === 'latest';

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

const upgradeVersion = async (branchVersion) => {
  await upgradePage.goToUpgradePage();
  await upgradePage.expandPreReleasesAccordion();

  await (await upgradePage.getInstallButton(branchVersion, TAG)).click();
  await (await upgradePage.upgradeModalConfirm()).click();

  await (await upgradePage.cancelUpgradeButton()).waitForDisplayed();
  await (await upgradePage.deploymentInProgress()).waitForDisplayed();
  await (await upgradePage.deploymentInProgress()).waitForDisplayed({ reverse: true, timeout: 100000 });

  if (testFrontend) {
    // https://github.com/medic/cht-core/issues/9186
    // this is an unfortunate incompatibility between current API and admin app in the old version
    await (await upgradePage.deploymentComplete()).waitForDisplayed();
  }
};

describe('Performing an upgrade', () => {
  before(async () => {
    await utils.saveDocs([...docs.places, ...docs.clinics, ...docs.persons, ...docs.reports]);
    await utils.createUsers([docs.user]);

    if (testFrontend) {
      // a variety of selectors that we use in e2e tests to interact with webapp
      // are not compatible with older versions of the app.
      await loginPage.login(docs.user);
      await commonPage.logout();
    }

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

  it('should have valid semver after installing', async () => {
    if (!testFrontend) {
      return;
    }

    const deployInfo = await utils.request({ path: '/api/deploy-info' });
    expect(semver.valid(deployInfo.version)).to.be.ok;
  });

  it('should upgrade to current branch', async () => {
    await upgradeVersion(BRANCH);

    const currentVersion = await upgradePage.getCurrentVersion();
    expect(version.getVersion(true)).to.include(currentVersion);

    await browser.refresh(); // load updated code of admin app
    await upgradePage.goToUpgradePage();
    const currentBuild = await upgradePage.getBuild();

    // there should be no staged ddocs
    const ddocs = await getDdocs();
    const staged = ddocs.filter(ddoc => ddoc._id.includes('staged'));
    expect(staged.length).to.equal(0);

    // For tags (betas and releases) we don't actually show the build number on the upgrade page
    ddocs.forEach(ddoc => expect(ddoc.version).to.include(currentBuild));

    const deployInfo = await utils.request({ path: '/api/deploy-info' });
    expect(semver.valid(deployInfo.version)).to.be.ok;

    const logs = await getUpgradeLogs();
    expect(logs.length).to.equal(2);
    expect(logs[1]).to.include({
      action: 'upgrade',
      state: 'finalized',
    });

    if (!testFrontend) {
      return;
    }

    await adminPage.logout();
    await loginPage.login(docs.user);
    await commonPage.sync(true);

    await browser.refresh();
    await commonPage.waitForPageLoaded();
    await commonPage.goToAboutPage();
    await (await aboutPage.aboutCard()).waitForDisplayed();
    const expected = TAG || `${utils.escapeBranchName(BRANCH)} (`;
    expect(await aboutPage.getVersion()).to.include(expected);
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
