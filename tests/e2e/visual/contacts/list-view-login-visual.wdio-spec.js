const commonPage = require('@page-objects/default/common/common.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const dataFactory = require('@factories/cht/generate');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const searchPage = require('@page-objects/default/search/search.wdio.page');
const utils = require('@utils');

const { resizeWindowForScreenshots, generateScreenshot } = require('@utils/screenshots');

describe('Contact List Page', () => {
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

  it('should show contacts page tab '+
    'when can_view_contact and can_view_contacts_tab permissions are enabled', async () => {
    expect(await commonPage.isContactTabPresent()).to.be.true;
    await generateScreenshot('contact-page', 'tab-visible');
    await commonPage.openHamburgerMenu();
    await generateScreenshot('contact-page', 'menu-opened');
    await commonPage.closeHamburgerMenu();
    await commonPage.goToPeople();
    expect(await commonPage.isPeopleListPresent()).to.be.true;
    await generateScreenshot('contact-page', 'people-list-visible');
    await commonPage.goToReports();
    await searchPage.performSearch('Amanda Allen');
    await commonPage.waitForLoaders();
    await reportsPage.openFirstReport();
    await reportsPage.rightPanelSelectors.patientName().waitForDisplayed();
    await generateScreenshot('contact-page', 'reports-visible');
    await reportsPage.rightPanelSelectors.patientName().click();
    await contactPage.waitForContactLoaded();
    await generateScreenshot('contact-page', 'contact-loaded');
    await commonPage.goToMessages();
  });

  it('should hide contacts page as tab and from menu option ' +
    'when can_view_contacts_tab permissions is enable but can_view_contact permission is not', async () => {
    await utils.updatePermissions(docs.user.roles, [], ['can_view_contacts'], {
      ignoreReload: true,
      revert: true,
      refresh: true,
      sync: true
    });
    await commonPage.waitForPageLoaded();
    await commonPage.goToMessages();
    expect(await commonPage.isContactTabPresent()).to.be.false;
    await generateScreenshot('contact-page', 'no-tab-visible');
    await commonPage.toggleMenuAndCaptureScreenshot('People', true, 'contact-page', 'no-menu-option');
    await commonPage.goToReports();
    await searchPage.performSearch('Amanda Allen');
    await commonPage.waitForLoaders();
    await reportsPage.openFirstReport();
    await (reportsPage.rightPanelSelectors.patientName()).waitForDisplayed();
    await generateScreenshot('contact-page', 'report-view-no-contacts');
    await reportsPage.rightPanelSelectors.patientName().click();
    await generateScreenshot('contact-page', 'report-no-contact-loaded');
    await commonPage.goToMessages();
  });

  it('should hide contacts page as tab, show from menu option ' +
    'when can_view_contact permissions is enable but can_view_contact permission is not', async () => {
    await utils.updatePermissions(docs.user.roles, ['can_view_contacts'], ['can_view_contacts_tab'], {
      ignoreReload: true,
      revert: true,
      refresh: true,
      sync: true
    });
    await commonPage.waitForPageLoaded();
    await commonPage.goToMessages();
    expect(await commonPage.isContactTabPresent()).to.be.false;
    await generateScreenshot('contact-page', 'no-tab-visible');
    await commonPage.toggleMenuAndCaptureScreenshot('People', false, 'contact-page', 'menu-option-visible');
    expect(await commonPage.isPeopleListPresent()).to.be.true;
    await commonPage.waitForPageLoaded();
    await generateScreenshot('contact-page', 'contacts-in-people-list');
    await commonPage.goToReports();
    await searchPage.performSearch('Amanda Allen');
    await commonPage.waitForLoaders();
    await reportsPage.openFirstReport();
    await (reportsPage.rightPanelSelectors.patientName()).waitForDisplayed();
    await generateScreenshot('contact-page', 'report-view-with-contacts');
    await reportsPage.rightPanelSelectors.patientName().click();
    await contactPage.waitForContactLoaded();
    await generateScreenshot('contact-page', 'report-contact-loaded');
    await commonPage.goToMessages();
  });

  it('should hide contacts page as a tab and from menu option ' +
    'when can_view_contact and can_view_contact permissions are disable', async () => {
    await utils.updatePermissions(docs.user.roles, [], ['can_view_contacts_tab', 'can_view_contacts'], {
      ignoreReload: true,
      revert: true,
      refresh: true,
      sync: true
    });
    await commonPage.waitForPageLoaded();
    await commonPage.goToMessages();
    expect(await commonPage.isContactTabPresent()).to.be.false;
    await generateScreenshot('contact-page', 'no-tab-visible-oPerms');
    await commonPage.toggleMenuAndCaptureScreenshot('People', true, 'contact-page', 'no-menu-option-no-Perms');
    await commonPage.goToReports();
    await searchPage.performSearch('Amanda Allen');
    await commonPage.waitForLoaders();
    await reportsPage.openFirstReport();
    await (reportsPage.rightPanelSelectors.patientName()).waitForDisplayed();
    await generateScreenshot('contact-page', 'report-view-no-contacts-no-perms');
    await reportsPage.rightPanelSelectors.patientName().click();
    await generateScreenshot('contact-page', 'report-no-contact-loaded-no-perms');
    await commonPage.goToMessages();
  });
});
