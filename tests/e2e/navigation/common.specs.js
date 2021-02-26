const commonElements = require('../../page-objects/common/common.po.js');
const utils = require('../../utils');

describe('Navigation tests : ', () => {
  beforeEach(utils.beforeEach);

  it('should open Messages tab', async () => {
    await commonElements.goToMessagesNative();
    expect(await commonElements.isAt('message-list'));
    expect(await browser.getCurrentUrl()).toMatch(utils.getBaseUrl() + 'messages');
  });

  it('should open tasks tab', async () => {
    await commonElements.goToTasks();
    expect(await commonElements.isAt('task-list'));
    expect(await browser.getCurrentUrl()).toEqual(utils.getBaseUrl() + 'tasks');
  });

  it('should open Reports or History tab', async () => {
    await commonElements.goToReportsNative();
    expect(await commonElements.isAt('reports-list'));
  });

  it('should open Contacts or Peoples tab', async () => {
    await commonElements.goToPeople();
    expect(await commonElements.isAt('contacts-list'));
    expect(await browser.getCurrentUrl()).toEqual(utils.getBaseUrl() + 'contacts');
  });

  it('should open Analytics tab', async () => {
    await commonElements.goToAnalytics();
    expect(await browser.getCurrentUrl()).toEqual(utils.getBaseUrl() + 'analytics');
  });
});
