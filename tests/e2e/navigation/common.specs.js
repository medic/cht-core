const commonElements = require('../../page-objects/common/common.po.js');
const utils = require('../../utils');

describe('Navigation tests : ', () => {
  beforeEach(utils.beforeEach);

  it('should open Messages tab', () => {
    commonElements.goToMessages();
    expect(commonElements.isAt('message-list'));
    expect(browser.getCurrentUrl()).toMatch(utils.getBaseUrl() + 'messages');
  });

  it('should open tasks tab', () => {
    commonElements.goToTasks();
    expect(commonElements.isAt('task-list'));
    expect(browser.getCurrentUrl()).toEqual(utils.getBaseUrl() + 'tasks');
  });

  it('should open Reports or History tab', () => {
    commonElements.goToReports();
    expect(commonElements.isAt('reports-list'));
  });

  it('should open Contacts or Peoples tab', () => {
    commonElements.goToPeople();
    expect(commonElements.isAt('contacts-list'));
    expect(browser.getCurrentUrl()).toEqual(utils.getBaseUrl() + 'contacts');
  });

  it('should open Analytics tab', () => {
    commonElements.goToAnalytics();
    expect(browser.getCurrentUrl()).toEqual(utils.getBaseUrl() + 'analytics');
  });
});
