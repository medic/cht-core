const commonElements = require('../../page-objects/common/common.po.js');
const utils = require('../../utils');

describe('Navigation tests : ', () => {
  beforeEach(utils.beforeEach);

  it('should open Configuration wizard', () => {
    commonElements.openMenu();
    commonElements.checkConfigurationWizard();
  });

  xit('should open Guided tour', () => {
    commonElements.openMenu();
    commonElements.checkGuidedTour();
  });

  xit('should open About', () => {
    commonElements.openMenu();
    commonElements.checkAbout();
  });

  xit('should open User settings', () => {
    commonElements.openMenu();
    commonElements.checkUserSettings();
  });

  xit('should open Report bug', () => {
    commonElements.openMenu();
    commonElements.checkReportBug();
  });

  xit('should open Configuration app', () => {
    commonElements.goToConfiguration();
    const display = element(by.css('[ui-sref="display.date-time"]'));
    expect(display.isPresent()).toBeTruthy();
    browser.get(utils.getBaseUrl() + 'messages/');
  });
});
