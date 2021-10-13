const path = require('path');
const expect = require('chai').expect;

const utils = require('../../utils');
const sentinelUtils = require('../sentinel/utils');
const analyticsPage = require('../../page-objects/analytics/analytics.wdio.page');
const loginPage = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const chtConfUtils = require('../../cht-conf-utils');

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

const compileTasks = async (configDirectory) => {
  await chtConfUtils.initializeConfigDir();
  const targetFilePath = path.join(__dirname, configDirectory, 'targets.js');

  return chtConfUtils.compileNoolsConfig(null, targetFilePath)
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

  it('should display targets with default values', async () => {
    await analyticsPage.goToTargets();

    const targets = await analyticsPage.getTargets();

    expect(targets).to.have.deep.members([
      { title: 'Deaths', goal: '0', count: '0' },
      { title: 'New pregnancies', goal: '20', count: '0' },
      { title: 'Live births', count: '1' },
      { title: 'Active pregnancies', count: '0' },
      { title: 'Active pregnancies with 1+ routine facility visits', count: '0' },
      { title: 'In-facility deliveries', percent: '0%', percentCount: '(0 of 0)' },
      { title: 'Active pregnancies with 4+ routine facility visits', count: '0' },
      { title: 'Active pregnancies with 8+ routine contacts', count: '0' },
    ]);
  });

  it('should display correct message when no target found', async () => {
    const tasks = await compileTasks('no-targets-config');
    await updateSettings({ tasks });
    await analyticsPage.goToTargets();

    const emptySelectionLoading = await analyticsPage.noSelectedTarget();
    await (emptySelectionLoading).waitForDisplayed();
    await commonPage.waitForLoaderToDisappear(emptySelectionLoading);

    const emptySelectionMessage = await analyticsPage.noSelectedTarget();
    await (emptySelectionMessage).waitForDisplayed();

    expect(await emptySelectionMessage.getText()).to.equal('No target found.');
  });

  it('should display correct message when targets are disabled', async () => {
    const tasks = {
      targets: { enabled: false }
    };
    await updateSettings({ tasks });
    await analyticsPage.goToTargets();

    const emptySelectionLoading = await analyticsPage.noSelectedTarget();
    await (emptySelectionLoading).waitForDisplayed();
    await commonPage.waitForLoaderToDisappear(emptySelectionLoading);

    const emptySelectionMessage = await analyticsPage.noSelectedTarget();
    await (emptySelectionMessage).waitForDisplayed();

    expect(await emptySelectionMessage.getText()).to.equal(
      'Targets are disabled for admin users. If you need to see targets, login as a normal user.'
    );
  });
});
