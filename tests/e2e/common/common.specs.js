const commonElements = require('../../page-objects/common/common.po.js'),
  utils = require('../../utils');

describe('Navigation tests : ', () => {
  beforeEach(utils.beforeEach);

  it('should open Messages tab', () => {
    commonElements.goToMessages();
    expect(commonElements.isAt('message-list'));
    expect(browser.getCurrentUrl()).toMatch(utils.getBaseUrl() + 'messages/');
  });

  it('should open tasks tab', () => {
    commonElements.goToTasks();
    expect(commonElements.isAt('task-list'));
    expect(browser.getCurrentUrl()).toEqual(utils.getBaseUrl() + 'tasks/');
  });

  it('should open Reports or History tab', () => {
    commonElements.goToReports();
    expect(commonElements.isAt('reports-list'));
  });

  it('should open Contacts or Peoples tab', () => {
    commonElements.goToPeople();
    expect(commonElements.isAt('contacts-list'));
    expect(browser.getCurrentUrl()).toEqual(utils.getBaseUrl() + 'contacts/');
  });

  it('should open Analytics or Targets tab', () => {
    commonElements.goToAnalytics();
    expect(browser.getCurrentUrl()).toEqual(utils.getBaseUrl() + 'analytics');
  });

  it('should open Configuration wizard', () => {
    commonElements.openMenu();
    commonElements.checkConfigurationWizard();
  });

  it('should open Guided tour', () => {
    commonElements.openMenu();
    commonElements.checkGuidedTour();
  });

  it('should open About', () => {
    commonElements.openMenu();
    commonElements.checkAbout();
  });

  it('should open User settings', () => {
    commonElements.openMenu();
    commonElements.checkUserSettings();
  });

  it('should open Report bug', () => {
    commonElements.openMenu();
    commonElements.checkReportBug();
  });

  it('should open Configuration app', () => {
    commonElements.goToConfiguration();
    const settings = element(by.css('[ui-sref="settings.basic"]'));
    expect(settings.isPresent()).toBeTruthy();
    browser.get(utils.getBaseUrl() + 'messages/');
  });
});
