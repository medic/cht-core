const path = require('path');

const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const analyticsPage = require('@page-objects/default/analytics/analytics.wdio.page');
const targetAggregatesPage = require('@page-objects/default/targets/target-aggregates.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const chtConfUtils = require('@utils/cht-conf');
const chtDbUtils = require('@utils/cht-db');
const { getTelemetry, destroyTelemetryDb } = require('@utils/telemetry');
const { createTargetDoc, REPORTING_PERIOD } = require('./utils/targets-helper-functions');
const { TARGET_MET_COLOR, TARGET_UNMET_COLOR } = analyticsPage;

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

  const chw = userFactory.build({ place: healthCenter._id, contact: contact });

  const previousMonthTargets = createTargetDoc(REPORTING_PERIOD.PREVIOUS, contact._id, {
    user: `org.couchdb.user:${chw.username}`,
    targets: [
      {
        id: 'deaths-this-month',
        value: { pass: 8, total: 9 }
      },
      {
        id: 'active-pregnancies',
        value: { pass: 42, total: 42 }
      },
    ],
  });
  const compileTargets = async (targetsFileName = 'targets-config.js') => {
    await chtConfUtils.initializeConfigDir();
    const targetFilePath = path.join(__dirname, `config/${targetsFileName}`);

    return chtConfUtils.compileConfig({ targets: targetFilePath });
  };

  before(async () => {
    await utils.saveDocs([...places.values(), owl, previousMonthTargets]);
    await utils.createUsers([chw]);
    await sentinelUtils.waitForSentinel();

    await loginPage.login(chw);
  });

  afterEach(async () => {
    await utils.revertSettings(true);
    await destroyTelemetryDb(chw.username);
  });

  it('should display targets from default config', async () => {
    await analyticsPage.goToTargets();

    const targets = await analyticsPage.getTargets({ includeSubtitle: true });

    expect(targets).to.have.deep.members([
      { title: 'Deaths', subtitle: 'This month', goal: '0', count: '0', countNumberColor: TARGET_MET_COLOR },
      {
        title: 'New pregnancies',
        subtitle: 'This month',
        goal: '20',
        count: '0',
        countNumberColor: TARGET_UNMET_COLOR
      },
      { title: 'Live births', subtitle: 'This month', count: '0', countNumberColor: TARGET_MET_COLOR },
      { title: 'Active pregnancies', subtitle: 'All time', count: '0', countNumberColor: TARGET_MET_COLOR },
      {
        title: 'Active pregnancies with 1+ routine facility visits',
        subtitle: 'All time',
        count: '0',
        countNumberColor: TARGET_MET_COLOR
      },
      { title: 'In-facility deliveries', subtitle: 'All time', percent: '0%', percentCount: '(0 of 0)' },
      {
        title: 'Active pregnancies with 4+ routine facility visits',
        subtitle: 'All time',
        count: '0',
        countNumberColor: TARGET_MET_COLOR
      },
      {
        title: 'Active pregnancies with 8+ routine contacts',
        subtitle: 'All time',
        count: '0',
        countNumberColor: TARGET_MET_COLOR
      },
    ]);
    expect(await targetAggregatesPage.getFilterCount()).to.equal(0);
  });

  it('should display targets from previous month', async () => {
    await targetAggregatesPage.openSidebarFilter();

    expect((await targetAggregatesPage.sidebarFilter.optionsContainer()).length).to.equal(1);
    const filterLabel = await analyticsPage.filterOptionLabel();
    expect(await filterLabel.getText()).to.equal('This month');
    const telemetrySidebarOpen = await getTelemetry('sidebar_filter:analytics:targets:open', chw.username);
    expect(telemetrySidebarOpen.length).to.equal(1);

    await targetAggregatesPage.selectFilterOption('Last month');
    await targetAggregatesPage.sidebarFilter.closeBtn().click();

    const telemetryReportingPeriod = await getTelemetry(
      'sidebar_filter:analytics:targets:reporting-period:select',
      chw.username
    );
    expect(telemetryReportingPeriod.length).to.equal(1);
    const targets = await analyticsPage.getTargets({ includeSubtitle: true });
    expect(targets).to.have.deep.members([
      { title: 'Deaths', subtitle: 'Last month', goal: '0', count: '8', countNumberColor: TARGET_MET_COLOR },
      { title: 'Active pregnancies', subtitle: 'All time', count: '42', countNumberColor: TARGET_MET_COLOR },
    ]);
    expect(await targetAggregatesPage.getFilterCount()).to.equal(1);
  });

  it('should display correct message when no target found', async () => {
    const settings = await compileTargets();
    await utils.updateSettings(settings, { ignoreReload: 'api', sync: true, refresh: true, revert: true  });

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
    await utils.updateSettings({ tasks }, { ignoreReload: 'api', sync: true, refresh: true, revert: true  });
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
    await utils.updateSettings(settings, { ignoreReload: 'api', sync: true, refresh: true, revert: true  });
    await analyticsPage.goToTargets();

    const { errorMessage, url, username, errorStack } = await commonPage.getErrorLog();

    expect(username).to.equal(chw.username);
    expect(url).to.equal('localhost');
    expect(errorMessage).to.equal('Error fetching targets');
    expect(await errorStack.isDisplayed()).to.be.true;
    expect(await errorStack.getText()).to
      .include('TypeError: Cannot read properties of undefined (reading \'muted\')');

    const feedbackDocs = await chtDbUtils.getFeedbackDocs();
    feedbackDocs.forEach(feedbackDoc => {
      expect(feedbackDoc.info.message).to.include('Cannot read properties of undefined (reading \'muted\')');
    });
    await chtDbUtils.clearFeedbackDocs();
  });
});
