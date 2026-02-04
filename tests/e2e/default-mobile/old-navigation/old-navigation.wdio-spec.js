const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const personFactory = require('@factories/cht/contacts/person');
const pregnancyFactory = require('@factories/cht/reports/pregnancy');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const oldNavigationPage = require('@page-objects/default/old-navigation/old-navigation.wdio.page');
const messagesPage = require('@page-objects/default/sms/messages.wdio.page');
const taskPage = require('@page-objects/default/tasks/tasks.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const targetAggregatesPage = require('@page-objects/default/targets/target-aggregates.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');

describe('Old Navigation', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');

  const offlineUser = userFactory.build({ place: healthCenter._id });

  const person = personFactory.build({ 
    phone: '+50689999999', 
    parent: { _id: healthCenter._id, parent: healthCenter.parent } 
  });

  const pregnancyReport = pregnancyFactory.build({
    contact: offlineUser.contact,
    fields: { patient_id: person._id }
  });

  const targetsConfig = [{ id: 'test_target', type: 'count', title: 'Test target', aggregate: true }];

  before(async () => {
    await utils.saveDocs([...places.values(), person, pregnancyReport]);
    await utils.createUsers([offlineUser]);

    const settings = await utils.getSettings();
    const tasks = settings.tasks;
    tasks.targets.items = targetsConfig;
    const permissions = settings.permissions;
    permissions.can_aggregate_targets = offlineUser.roles;
    permissions.can_view_old_navigation = offlineUser.roles;
    await utils.updateSettings({ tasks, permissions }, { ignoreReload: true });

    await loginPage.login({username: offlineUser.username, password: offlineUser.password, loadPage: false});
    await oldNavigationPage.waitForPageLoaded();
  });

  after(async () => {
    await utils.deleteUsers([offlineUser]);
  });

  it('should navigate to the Messages section and open a sent message', async () => {
    const message = 'Navigations test';
    await messagesPage.sendMessageOnMobile(message, person.name, person.phone );
    await messagesPage.openMessage(person._id);

    const { name } = await oldNavigationPage.getHeaderTitleOnMobile();
    expect(name).to.equal(person.name);

    const messages = await messagesPage.getAmountOfMessagesByPhone();
    const { content, state } = await messagesPage.getMessageContent(messages);
    expect(content).to.equal(message);
    expect(state).to.equal('pending');
  });

  it('should navigate to the Task section and open the first task listed', async () => {
    await oldNavigationPage.goToTasks();
    await taskPage.openTaskById(
      pregnancyReport._id,
      '~pregnancy-danger-sign-follow-up~anc.pregnancy_danger_sign_followup'
    );
    const { name } = await oldNavigationPage.getHeaderTitleOnMobile();
    expect(name).to.equal('Pregnancy danger sign follow-up');
  });

  it('should navigate to the Reports section and open the first report listed', async () => {
    await oldNavigationPage.goToReports();
    await reportsPage.openSelectedReport(await reportsPage.leftPanelSelectors.firstReport());
    await commonPage.waitForLoaders();
    const openReportInfo = await reportsPage.getOpenReportInfo();
    expect(openReportInfo.patientName).to.equal(person.name);
    expect(openReportInfo.reportName).to.equal('Pregnancy registration');
  });

  it('should navigate to the People section and open the created Health Center', async () => {
    await oldNavigationPage.goToPeople();
    await contactPage.selectLHSRowByText(healthCenter.name);
    expect(await contactPage.getContactInfoName()).to.equal(healthCenter.name);
  });

  it('should navigate to the Targets section, and open a target aggregate', async () => {
    await oldNavigationPage.goToAnalytics();
    await targetAggregatesPage.goToTargetAggregates(true);
    await targetAggregatesPage.openTargetDetails(targetsConfig[0]);
  });

  it('should successfully sync', async () => {
    await oldNavigationPage.goToPeople();
    await oldNavigationPage.sync();
  });
});
