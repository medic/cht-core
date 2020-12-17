const commonElements = require('../../page-objects/common/common.po.js');
const utils = require('../../utils');
const helper=require('../../helper');

describe('Hamburger Menu tests : ', () => {

  beforeEach(utils.beforeEach);

  it('should open Configuration wizard', () => {
    helper.waitUntilReady(element(by.css('#update-available')),60000);
    helper.handleUpdateModal();
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
    commonElements.expectDisplayDate();
    browser.get(utils.getBaseUrl() + 'messages/');
  });
});
