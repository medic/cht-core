const commonElements = require('../../page-objects/common/common.po.js');
const utils = require('../../utils');
const loginPage = require('../../page-objects/login/login.po');

describe('Navigation tests : ', () => {
  beforeEach(utils.beforeEach);

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

    const newPermissions =  {
      can_view_messages: ['program_officer'],
      can_view_messages_tab: ['program_officer'],
      can_view_reports: ['program_officer'],
      can_view_reports_tab: ['program_officer'],
      can_view_contacts: ['program_officer'],
      can_view_contacts_tab: ['program_officer'],
      can_view_analytics: [],
      can_view_nalytics_tab: []
    };

    let originalTimeout;

    beforeEach(async () =>{
      originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 2 * 60 * 1000;
      await utils.beforeEach();
    });

    beforeAll(async () => {
      await browser.driver.manage().window().setSize(389, 500);
      await utils.saveDoc(district);
      await utils.createUsers([user]);
    });

    afterAll(async () => {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
      await browser.driver.manage().window().setSize(1024,768);
    });

    it('No tab text labels displayed  on mobile view for over 3 tabs', async () => {
      const tabTexts = await element.all(by.css('.button-label')).getText();
      expect(tabTexts.length).toBe(5);
      expect(tabTexts).toEqual([ '', '', '', '', '' ]);
    });

    it('Display page tab text labels even on mobile view, whenever there are 3 or fewer tabs', async () => {
      //change permissions
      const settings = await utils.getSettings();
      const permissions = settings.permissions;
      await utils.updateSettings({permissions: Object.assign(permissions, newPermissions)});
      await commonElements.goToLoginPageNative();
      await loginPage.loginNative(user.username, user.password);
      const tabTexts = await element.all(by.css('.button-label')).getText();
      expect(tabTexts.length).toBe(3);
      expect(tabTexts).toEqual([ 'Messages','Reports', 'People']);
    });
  });
});

