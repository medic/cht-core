const helper = require('../../helper.js');
const commonElements = require('../../page-objects/common/common.po.js');
const utils = require('../../utils');

describe('Navigation tests : ', () => {
  beforeEach(utils.beforeEach);

  it('should open Messages tab', () => {
    commonElements.goToMessages();
    expect(commonElements.isAt('message-list'));
    //expect(browser.getCurrentUrl()).toMatch(utils.getBaseUrl() + 'messages/');
  });

  it('should open tasks tab', () => {
    commonElements.goToTasks();
    expect(commonElements.isAt('task-list'));
    //expect(browser.getCurrentUrl()).toEqual(utils.getBaseUrl() + 'tasks/');
  });

  it('should open Reports or History tab', () => {
    commonElements.goToReports();
    helper.handleUpdateModal();
    expect(commonElements.isAt('reports-list'));
  });

  it('should open Contacts or Peoples tab', () => {
    commonElements.goToPeople();
    expect(commonElements.isAt('contacts-list'));
  });

  it('should open Analytics tab', () => {
    commonElements.goToAnalytics();
    expect(element(by.css('div.targets')).isPresent());
  });

  it('should open About', () => {
    commonElements.openMenu();
    commonElements.checkAbout();
  });

  it('should open Report bug', () => {
    helper.handleUpdateModal();
    commonElements.openMenu();
    commonElements.checkReportBug();
  });

  it('should open Guided tour', () => {
    commonElements.openMenu();
    commonElements.checkGuidedTour();
  });

  xit('should open User settings', () => {
    commonElements.openMenu();
    commonElements.checkUserSettings();
  });

  //tests only for admin removed
});
