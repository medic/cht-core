const commonElements = require('../../page-objects/common/common.po.js');
const utils = require('../../utils');
const loginPage = require('../../page-objects/login/login.po');
const constants = require('../../constants.js');

describe('Navigation tests : ', () => {
  beforeEach(utils.beforeEach);
  afterAll(async () => await utils.revertDb());

  it('should open Messages tab', async () => {
    await commonElements.goToMessagesNative();
    expect(await commonElements.isAt('message-list'));
    expect(await browser.getCurrentUrl()).toMatch(utils.getBaseUrl() + 'messages/');
  });

  it('should open tasks tab', async () => {
    await commonElements.goToTasks();
    expect(await commonElements.isAt('task-list'));
    expect(await browser.getCurrentUrl()).toEqual(utils.getBaseUrl() + 'tasks');
  });

  it('should open Reports or History tab', async () => {
    await commonElements.goToReportsNative(true);
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
    const display = element(by.css('[ui-sref="display.date-time"]'));
    expect(await display.isPresent()).toBeTruthy();
    await browser.get(utils.getBaseUrl() + 'messages/');
  });

  //mobile resolution
  describe('Mobile view tests : ', () => {
    const district = {
      _id: 'district_id',
      type: 'clinic',
      name: 'District',
    };
    const user = {
      username: 'user',
      password: 'Sup3rSecret!',
      place:district._id,
      contact: {
        _id: 'some_id',
        name: 'contact'
      },
      roles: ['program_officer']
    };

    let originalTimeout;

    beforeEach(async () => await utils.beforeEach());

    beforeAll(async () => {
      originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 2 * 60 * 1000;
      await utils.saveDoc(district);
      await utils.createUsers([user]);
    });

    afterAll(async () => {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
      await utils.deleteUsers([user]);
      await utils.revertSettings(true);
      await commonElements.goToLoginPageNative();
      await loginPage.loginNative(constants.USERNAME, constants.PASSWORD);
      await commonElements.waitForLoaderToDisappear();
    });

    it('should display tab labels on mobile view, when all tabs are enabled', async () => {
      const tabTexts = await element.all(by.css('.button-label')).getText();
      expect(tabTexts.length).toBe(5);
      expect(tabTexts).toEqual([ 'Messages', 'Tasks', 'Reports', 'People', 'Targets' ]);
    });

    it('should display tab labels on mobile view, when some tabs are enabled', async () => {
      //change permissions
      const originalSettings = await utils.getSettings();
      const permissions = originalSettings.permissions;
      await utils.updateSettings({ permissions:Object.assign(permissions, {
        can_view_analytics: [],
        can_view_analytics_tab: [],
        can_view_tasks: [],
        can_view_tasks_tab: []
      })});

      await commonElements.goToLoginPageNative();
      await loginPage.loginNative(user.username, user.password);
      await commonElements.waitForLoaderToDisappear();
      await utils.closeTour();
      const tabTexts = await element.all(by.css('.button-label')).getText();
      expect(tabTexts.length).toBe(3);
      expect(tabTexts).toEqual([ 'Messages', 'Reports', 'People']);
    });
  });
});

