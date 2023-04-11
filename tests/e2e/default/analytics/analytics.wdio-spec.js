const path = require('path');
const expect = require('chai').expect;

const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const analyticsPage = require('@page-objects/default/analytics/analytics.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const chtConfUtils = require('@utils/cht-conf');

const contacts = [
  {
    _id: 'fixture:district',
    type: 'district_hospital',
    name: 'District',
    place_id: 'district',
    reported_date: new Date().getTime(),
  },
  {
    _id: 'fixture:center',
    type: 'health_center',
    name: 'Health Center',
    parent: { _id: 'fixture:district' },
    place_id: 'health_center',
    reported_date: new Date().getTime(),
  },
];

const chw = {
  username: 'bob',
  password: 'medic.123',
  place: 'fixture:center',
  contact: { _id: 'fixture:user:bob', name: 'Bob' },
  roles: [ 'chw' ],
};

const updateSettings = async (settings) => {
  await utils.updateSettings(settings, 'api');
  await commonPage.sync(true);
  await browser.refresh();
};

const compileTargets = async () => {
  await chtConfUtils.initializeConfigDir();
  const targetFilePath = path.join(__dirname, 'targets-config.js');

  return chtConfUtils.compileNoolsConfig({ targets: targetFilePath });
};

describe('Targets', () => {
  before(async () => {
    await utils.saveDocs(contacts);
    await utils.createUsers([ chw ]);
    await sentinelUtils.waitForSentinel();

    await loginPage.login({ username: chw.username, password: chw.password });
    await commonPage.closeTour();
    await (await commonPage.analyticsTab()).waitForDisplayed();
  });

  afterEach(async () => {
    await utils.revertSettings(true);
  });

  it('should display targets from default config', async () => {
    await analyticsPage.goToTargets();

    const targets = await analyticsPage.getTargets();

    expect(targets).to.have.deep.members([
      { title: 'Deaths', goal: '0', count: '0' },
      { title: 'New pregnancies', goal: '20', count: '0' },
      { title: 'Live births', count: '0' },
      { title: 'Active pregnancies', count: '0' },
      { title: 'Active pregnancies with 1+ routine facility visits', count: '0' },
      { title: 'In-facility deliveries', percent: '0%', percentCount: '(0 of 0)' },
      { title: 'Active pregnancies with 4+ routine facility visits', count: '0' },
      { title: 'Active pregnancies with 8+ routine contacts', count: '0' },
    ]);
  });

  it('should display correct message when no target found', async () => {
    const settings = await compileTargets();
    await updateSettings(settings);
    await analyticsPage.goToTargets();

    const emptySelection = await analyticsPage.noSelectedTarget();
    await (emptySelection).waitForDisplayed();
    await commonPage.waitForLoaderToDisappear(emptySelection);

    expect(await emptySelection.getText()).to.equal('No target found.');
  });

  it('should display correct message when targets are disabled', async () => {
    const tasks = {
      targets: { enabled: false }
    };
    await updateSettings({ tasks });
    await analyticsPage.goToTargets();

    const emptySelection = await analyticsPage.noSelectedTarget();
    await (emptySelection).waitForDisplayed();
    await commonPage.waitForLoaderToDisappear(emptySelection);

    expect(await emptySelection.getText()).to.equal(
      'Targets are disabled for admin users. If you need to see targets, login as a normal user.'
    );
  });
});
