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
  fdescribe('Mobile view tests : ', () => {
    const district = {
      _id: 'district_id',
      type: 'clinic',
      name: 'District',
    };
    const offlineUser = {
      username: 'user',
      password: 'Sup3rSecret!',
      place: district._id,
      contact: {
        _id: 'some_id',
        name: 'user'
      },
      roles: ['district_admin']
    };

    const settings = {
      'permissions': {
        'can_view_messages': ['district_admin'],
        'can_view_messages_tab': ['district_admin'],
        'can_view_reports': ['district_admin'],
        'can_view_reports_tab': ['district_admin'],
        'can_view_contacts': ['district_admin'],
        'can_view_contacts_tab': ['district_admin']
      }
    };

    let originalTimeout;

    beforeEach(async () =>{
      originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 2 * 60 * 1000;
      await utils.beforeEach();
    });

    afterAll(function() {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    });

    beforeAll(async () => {
      await utils.saveDoc(district);
      await utils.createUsers([offlineUser]);
    });

    it('No tab text labels displayed  on mobile view for over 3 tabs', async () => {
      await browser.driver.manage().window().setSize(389, 500);
      const tabTexts = await element.all(by.css('.button-label')).getText();
      expect(tabTexts.length).toBe(5);
      expect(tabTexts).toEqual([ '', '', '', '', '' ]);
    });

    it('Display page tab text labels even on mobile view, whenever there are 3 or fewer tabs', async () => {
      //change permissions
      await utils.updateSettings(settings);
      await commonElements.goToLoginPageNative();
      await loginPage.loginNative(offlineUser.username, offlineUser.password);
      await utils.closeTour(50000);
      const tabTexts = await element.all(by.css('.button-label')).getText();
      expect(tabTexts.length).toBe(3);
      expect(tabTexts).toEqual([ 'Messages','Reports', 'People']);
    });
  });
});

