const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');

describe('Navigation tests', async () => {
  beforeEach(async () => {
    await loginPage.cookieLogin();
  });

  it('should open Messages tab', async () => {
    await commonPage.goToMessages();
    expect(await commonPage.isMessagesListPresent());
  });

  it('should open tasks tab', async () => {
    await commonPage.goToTasks();
    expect(await commonPage.isTasksListPresent());
  });

  it('should open Reports or History tab', async () => {
    await commonPage.goToReports();
    expect(await commonPage.isReportsListPresent());
  });

  it('should open Contacts or Peoples tab', async () => {
    await commonPage.goToPeople();
    expect(await commonPage.isPeopleListPresent());
  });

  it('should open Analytics tab', async () => {
    await commonPage.goToAnalytics();
    expect(await commonPage.isTargetMenuItemPresent());
    expect(await commonPage.isTargetAggregatesMenuItemPresent());
  });
});
