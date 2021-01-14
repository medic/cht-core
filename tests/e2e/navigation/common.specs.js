const commonElements = require('../../page-objects/common/common.po.js');
const utils = require('../../utils');

describe('Navigation tests : ', () => {
  beforeEach(utils.beforeEach);

  it('should open Messages tab', async () => {
    await commonElements.goToMessagesNative();
    expect(await commonElements.isAtNative('#message-list'));
  });

  it('should open tasks tab', async () => {
    await commonElements.goToTasksNative();
    expect(await commonElements.isAtNative('#task-list'));
  });

  it('should open Reports or History tab', async () => {
    await commonElements.goToReportsNative();
    expect(await commonElements.isAtNative('#reports-list'));
  });

  it('should open Contacts or Peoples tab', async () => {
    await commonElements.goToPeopleNative();
    expect(await commonElements.isAtNative('#contacts-list'));
  });

  it('should open Analytics tab', async () => {
    await commonElements.goToAnalyticsNative();
    expect(await commonElements.isAtNative('.targets'));
  });
});
