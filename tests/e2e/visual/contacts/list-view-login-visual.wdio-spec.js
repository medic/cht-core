const commonPage = require('@page-objects/default/common/common.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const dataFactory = require('@factories/cht/generate');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const utils = require('@utils');

const { resizeWindowForScreenshots, generateScreenshot } = require('@utils/screenshots');

describe('Contact Page | List View (Access)', () => {
  const updateRolePermissions = async (roleValue, addPermissions, removePermissions = []) => {
    const roles = [roleValue];
    const settings = await utils.getSettings();
    settings.roles[roleValue] = { offline: true };
    const permissions = await utils.getUpdatedPermissions(roles, addPermissions, removePermissions);
    await utils.updateSettings(
      { roles: settings.roles, permissions },
      { revert: true, ignoreReload: true, refresh: true, sync: true }
    );
  };

  const docs = dataFactory.createHierarchy({
    name: 'Janet Mwangi',
    user: true,
    nbrClinics: 10,
    nbrPersons: 4,
    useRealNames: true,
  });

  before(async () => {
    await resizeWindowForScreenshots();
    await utils.saveDocs([...docs.places, ...docs.clinics, ...docs.persons, ...docs.reports]);
    await utils.createUsers([docs.user]);
  });

  after(async () => {
    await utils.deleteUsers([docs.user]);
    await utils.revertDb([/^form:/], true);
  });

  beforeEach(async () => {
    await loginPage.login(docs.user);
  });

  afterEach(async () => {
    await commonPage.logout();
  });

  describe('Log in', () => {
    it('having can_view_contact and can_view_contacts_tab permissions, ' +
      'should show contacts page as tab, hidden from menu option', async () => {
      await (await commonPage.contactsTab()).waitForDisplayed();
      await generateScreenshot('ContactPage', 'TabVisible');
      await commonPage.openHamburgerMenu();
      await generateScreenshot('ContactPage', 'MenuOpened');
      await commonPage.closeHamburgerMenu();
      await commonPage.goToPeople();
      expect(await commonPage.isPeopleListPresent()).to.be.true;
      await generateScreenshot('ContactPage', 'PeopleListVisible');
      await commonPage.goToReports();
      await reportsPage.openFirstReport();
      await reportsPage.rightPanelSelectors.patientName().waitForClickable();
      await generateScreenshot('ContactPage', 'ReportsVisible');
      await reportsPage.rightPanelSelectors.patientName().click();
      await contactPage.waitForContactLoaded();
      await generateScreenshot('ContactPage', 'ContactLoaded');
      await commonPage.goToMessages();
    });

    it('not having can_view_contact and having can_view_contacts_tab permissions, ' +
      'should hide contacts page as tab, hidden from menu option as well', async () => {
      await updateRolePermissions('chw', [], ['can_view_contacts']);
      await commonPage.waitForPageLoaded();
      await commonPage.goToMessages();
      await (await commonPage.contactsTab()).waitForDisplayed({ reverse: true });
      await generateScreenshot('ContactPage', 'NoTabVisible');
      await commonPage.openHamburgerMenu();
      await (await commonPage.contactsButton()).waitForClickable({ reverse: true });
      await generateScreenshot('ContactPage', 'NoMenuOption');
      await commonPage.closeHamburgerMenu();
      await commonPage.goToReports();
      await reportsPage.openFirstReport();
      await (reportsPage.rightPanelSelectors.patientName()).waitForClickable();
      await generateScreenshot('ContactPage', 'ReportView_NoContacts');
      await reportsPage.rightPanelSelectors.patientName().click();
      await generateScreenshot('ContactPage', 'Report_NoContactLoaded');
      await commonPage.goToMessages();
    });

    it('having can_view_contact and not having can_view_contacts_tab permissions, ' +
      'should hide contacts page as tab, show from menu option', async () => {
      await updateRolePermissions('chw', ['can_view_contacts'], ['can_view_contacts_tab']);
      await commonPage.waitForPageLoaded();
      await commonPage.goToMessages();
      await (await commonPage.contactsTab()).waitForDisplayed({ reverse: true });
      await generateScreenshot('ContactPage', 'NoTabVisible');
      await commonPage.openHamburgerMenu();
      await (await commonPage.contactsButton()).waitForClickable();
      await generateScreenshot('ContactPage', 'MenuOptionVisible');
      await (await commonPage.contactsButton()).click();
      expect(await commonPage.isPeopleListPresent()).to.be.true;
      await commonPage.waitForPageLoaded();
      await generateScreenshot('ContactPage', 'ContactsInPeopleList');
      await commonPage.goToReports();
      await reportsPage.openFirstReport();
      await (reportsPage.rightPanelSelectors.patientName()).waitForClickable();
      await generateScreenshot('ContactPage', 'ReportView_WithContacts');
      await reportsPage.rightPanelSelectors.patientName().click();
      await contactPage.waitForContactLoaded();
      await generateScreenshot('ContactPage', 'Report_ContactLoaded');
      await commonPage.goToMessages();
    });

    it('should hide contacts page as a tab and from the menu ' +
      'if user lacks can_view_contact and can_view_contacts_tab permissions', async () => {
      await updateRolePermissions('chw', [], ['can_view_contacts_tab', 'can_view_contacts']);
      await commonPage.waitForPageLoaded();
      await commonPage.goToMessages();
      await (await commonPage.contactsTab()).waitForDisplayed({ reverse: true });
      await generateScreenshot('ContactPage', 'NoTabVisible_NoPerms');
      await commonPage.openHamburgerMenu();
      await (await commonPage.contactsButton()).waitForClickable({ reverse: true });
      await generateScreenshot('ContactPage', 'NoMenuOption_NoPerms');
      await commonPage.closeHamburgerMenu();
      await commonPage.goToReports();
      await reportsPage.openFirstReport();
      await (reportsPage.rightPanelSelectors.patientName()).waitForClickable();
      await generateScreenshot('ContactPage', 'ReportView_NoContacts_NoPerms');
      await reportsPage.rightPanelSelectors.patientName().click();
      await generateScreenshot('ContactPage', 'Report_NoContactLoaded_NoPerms');
      await commonPage.goToMessages();
    });
  });
});
