xdescribe('Performing an upgrade', () => {
  before(async () => {
    await utils.saveDocs([...docs.places, ...docs.clinics, ...docs.persons, ...docs.reports]);
    await utils.createUsers([docs.user]);

    await loginPage.login(docs.user);
    await commonPage.logout();

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

  // TODO Enable this test after 4.6.0 is released
  xit('should have valid semver after installing', async () => {
    const deployInfo = await utils.request({ path: '/api/deploy-info' });
    expect(semver.valid(deployInfo.version)).to.be.ok;
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

    if (testFrontend) {
      // Old admin pages will not show the correct deployment complete message because of a change in API
      // https://github.com/medic/cht-core/issues/9186
      await (await upgradePage.deploymentComplete()).waitForDisplayed();
    }

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

    const deployInfo = await utils.request({ path: '/api/deploy-info' });
    expect(semver.valid(deployInfo.version)).to.be.ok;

    const logs = await getUpgradeLogs();
    expect(logs.length).to.equal(2);
    expect(logs[1]).to.include({
      action: 'upgrade',
      state: 'finalized',
    });

    await adminPage.logout();
    await loginPage.login(docs.user);
    await commonPage.sync(true);

    await browser.refresh();
    await commonPage.waitForPageLoaded();
    await commonPage.goToAboutPage();
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
