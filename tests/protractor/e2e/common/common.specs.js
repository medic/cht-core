const commonElements = require('../../page-objects/common/common.po.js');

describe('Navigation tests : ', () => {
  it('should open Messages tab', () => {
    commonElements.goToMessages();
    expect(commonElements.isAt('message-list'));
    expect(browser.getCurrentUrl()).toEqual(commonElements.getBaseUrl() + 'messages/');
  });

  it('should open tasks tab', () => {
    commonElements.goToTasks();
    expect(commonElements.isAt('task-list'));
    expect(browser.getCurrentUrl()).toEqual(commonElements.getBaseUrl() + 'tasks/');
  });

  it('should open Reports or History tab', () => {
    commonElements.goToReports();
    expect(commonElements.isAt('reports-list'));
    expect(browser.getCurrentUrl()).toEqual(commonElements.getBaseUrl() + 'reports/');
  });

  it('should open Contacts or Peoples tab', () => {
    commonElements.goToPeople();
    expect(commonElements.isAt('contacts-list'));
    expect(browser.getCurrentUrl()).toEqual(commonElements.getBaseUrl() + 'contacts/');
  });

  it('should open Analytics or Targets tab', () => {
    commonElements.goToAnalytics();
    expect(browser.getCurrentUrl()).toEqual(commonElements.getBaseUrl() + 'analytics');

  });

  it('should open Configuration tab', () => {
    commonElements.goToConfiguration();
    expect(browser.getCurrentUrl()).toEqual(commonElements.getBaseUrl() + 'configuration');
  });
});
