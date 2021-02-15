const commonElements = require('../../page-objects/common/common.po.js');
const utils = require('../../utils');

describe('Hamburger Menu tests : ', () => {

  beforeEach(utils.beforeEach);

  it('should open Configuration wizard', async () => {
    await commonElements.openMenuNative();
    await commonElements.checkConfigurationWizard();
  });

  it('should open Guided tour', async () => {
    await commonElements.openMenuNative();
    await commonElements.checkGuidedTour();
  });

  it('should open About', async () => {
    await commonElements.openMenuNative();
    await commonElements.checkAbout();
  });

  it('should open User settings', async () => {
    await commonElements.openMenuNative();
    await commonElements.checkUserSettings();
  });

  it('should open Report bug', async () => {
    await commonElements.openMenuNative();
    await commonElements.checkReportBug();
  });

  it('should open Configuration app', async () => {
    await commonElements.goToConfiguration();
    await commonElements.expectDisplayDate();
    await commonElements.goToMessagesNative();
  });
});
