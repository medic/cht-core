const languagesPage = require('@page-objects/default/translations/languages.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const utils = require('@utils');
const userSettingsElements = require('@page-objects/default/users/user-settings.wdio.page');
const contactsPage = require('@page-objects/default/contacts/contacts.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const messagesPage = require('@page-objects/default/sms/messages.wdio.page');


const addTranslations = async (langCode, translations = {}) => {
  const waitForServiceWorker = await utils.waitForApiLogs(utils.SW_SUCCESSFUL_REGEX);
  await utils.addTranslations(langCode, translations);

  await waitForServiceWorker.promise;
  await commonPage.refresh();
  await commonPage.closeReloadModal(true);

};

describe('Adding new language', () => {
  const NEW_LANG_NAME = 'Afrikaans';
  const NEW_LANG_CODE = 'afr';
  const NEW_TRANSLATIONS = {
    'No messages found': 'Geen boodskappe gevind nie',
    'No contacts found': 'Geen mense gevind nie',
    'reports.none': 'Geen verslae gevind nie',
    'Analytics': 'Analytiks'
  };

  before(async () => {
    await utils.enableLanguages([NEW_LANG_CODE]);
    await loginPage.cookieLogin();
  });

  after(async () => {
    await utils.revertSettings(true);
  });

  it('should show in enabled language list', async () => {
    await languagesPage.goToLanguagesTab();
    await languagesPage.addNewLanguage(NEW_LANG_CODE, NEW_LANG_NAME);
    const languageName = await languagesPage.languageDisplayed(NEW_LANG_CODE);
    expect(languageName.trim()).to.equal(NEW_LANG_NAME);
  });

  it('should be set as Default language ', async () => {
    expect(await languagesPage.selectLanguage(languagesPage.defaultLanguageDropdown, NEW_LANG_CODE)).to.be.true;
    expect(await languagesPage.selectLanguage(languagesPage.outgoingLanguageDropdown, NEW_LANG_CODE)).to.be.true;
    await commonPage.goToBase();
  });

  it('should add new translations', async () => {
    await userSettingsElements.setLanguage('en');
    await addTranslations(NEW_LANG_CODE, NEW_TRANSLATIONS);
    await userSettingsElements.setLanguage(NEW_LANG_CODE);
    await browser.waitUntil(
      async () => await commonPage.tabsSelector.analyticsTab().getText() === NEW_TRANSLATIONS.Analytics
    );

    // Check for translations in the UI
    await commonPage.goToMessages();
    await commonPage.waitForPageLoaded();
    expect(await messagesPage.getMessageLoadingStatus()).to.equal(NEW_TRANSLATIONS['No messages found']);

    await commonPage.goToReports();
    await commonPage.waitForPageLoaded();
    expect(await reportsPage.getReportListLoadingStatus()).to.equal(NEW_TRANSLATIONS['reports.none']);

    await commonPage.goToPeople();
    await commonPage.waitForPageLoaded();
    expect(await contactsPage.getContactListLoadingStatus()).to.equal(NEW_TRANSLATIONS['No contacts found']);
  });

  it('should support deleting translations', async () => {
    await addTranslations(NEW_LANG_CODE, NEW_TRANSLATIONS);

    await utils.deleteDoc(`messages-${NEW_LANG_CODE}`);

    await utils.stopApi();
    await utils.startApi();
    await commonPage.goToReports();
  }).timeout(120 * 1000);
});
