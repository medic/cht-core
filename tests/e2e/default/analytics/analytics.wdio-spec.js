const path = require('path');

const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const analyticsPage = require('@page-objects/default/analytics/analytics.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const chtConfUtils = require('@utils/cht-conf');
const chtDbUtils = require('@utils/cht-db');
const { TARGET_MET_COLOR, TARGET_UNMET_COLOR } = analyticsPage;

const updateSettings = async (settings) => {
  await utils.updateSettings(settings, 'api');
  await commonPage.sync(true);
  await browser.refresh();
};

const compileTargets = async (targetsFileName = 'targets-config.js') => {
  await chtConfUtils.initializeConfigDir();
  const targetFilePath = path.join(__dirname, `config/${targetsFileName}`);

  return chtConfUtils.compileNoolsConfig({ targets: targetFilePath });
};

describe('Targets', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const clinic = places.get('clinic');

  const contact = personFactory.build({
    name: 'CHW',
    phone: '+50683333333',
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  });
  const owl = personFactory.build({
    name: 'Owl',
    phone: '+50683444444',
    parent: { _id: clinic._id, parent: clinic.parent }
  });

  const chw = userFactory.build({ place: healthCenter._id, roles: ['chw'], contact });

  before(async () => {
    await utils.saveDocs([...places.values(), owl]);
    await utils.createUsers([chw]);
    await sentinelUtils.waitForSentinel();

    await loginPage.login(chw);
    await (await commonPage.analyticsTab()).waitForDisplayed();
  });

  afterEach(async () => {
    await utils.revertSettings(true);
  });

  it('should display targets from default config', async () => {
    await analyticsPage.goToTargets();

    const targets = await analyticsPage.getTargets();

    expect(targets).to.have.deep.members([
      { title: 'Deaths', goal: '0', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'New pregnancies', goal: '20', count: '0', countNumberColor: TARGET_UNMET_COLOR },
      { title: 'Live births', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'Active pregnancies', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'Active pregnancies with 1+ routine facility visits', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'In-facility deliveries', percent: '0%', percentCount: '(0 of 0)' },
      { title: 'Active pregnancies with 4+ routine facility visits', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'Active pregnancies with 8+ routine contacts', count: '0', countNumberColor: TARGET_MET_COLOR },
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

  it('should show error message for bad config', async () => {
    const settings = await compileTargets('targets-error-config.js');
    await updateSettings(settings);
    await analyticsPage.goToTargets();

    const { errorMessage, url, username, errorStack } = await commonPage.getErrorLog();

    expect(username).to.equal(chw.username);
    expect(url).to.equal('localhost');
    expect(errorMessage).to.equal('Error fetching targets');
    expect(await (await errorStack.isDisplayed())).to.be.true;
    expect(await (await errorStack.getText())).to
      .include('TypeError: Cannot read properties of undefined (reading \'muted\')');

    const feedbackDocs = await chtDbUtils.getFeedbackDocs();
    expect(feedbackDocs.length).to.equal(1);
    expect(feedbackDocs[0].info.message).to.include('Cannot read properties of undefined (reading \'muted\')');
    await chtDbUtils.clearFeedbackDocs();
  });
});
