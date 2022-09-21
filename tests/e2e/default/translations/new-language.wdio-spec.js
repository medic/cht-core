const languagesPage = require('../../../page-objects/admin/languages.wdio.page');
const commonPo = require('../../../page-objects/common/common.wdio.page');
const utils = require('../../../utils');
const userSettingsElements = require('../../../page-objects/user-settings/user-settings.wdio.page');
const contactsPage = require('../../../page-objects/contacts/contacts.wdio.page');
const reportsPage = require('../../../page-objects/reports/reports.wdio.page');
const loginPage = require('../../../page-objects/login/login.wdio.page');
const messagesPage = require('../../../page-objects/messages/messages.wdio.page');

const NEW_LANG_NAME = 'Afrikaans';
const NEW_LANG_CODE = 'afr';

describe('Adding new language', () => {
  const addTranslations = async () => {
    const waitForServiceWorker = await utils.waitForApiLogs(utils.SW_SUCCESSFUL_REGEX);
    await utils.addTranslations(NEW_LANG_CODE, {
      'No messages found':'Geen boodskappe gevind nie',
      'No contacts found':'Geen mense gevind nie',
      'reports.none':'Geen verslae gevind nie',
      'Analytics': 'Analytiks'
    });

    await waitForServiceWorker.promise;
    await browser.refresh();
  };

  before(async () => await loginPage.cookieLogin());

  after(async () => await browser.setCookies({ name: 'locale', value: 'en' }));

  it('should show in enabled language list', async () => {
    await languagesPage.goToLanguagesTab();
    await languagesPage.addNewLanguage(NEW_LANG_CODE, NEW_LANG_NAME);
    const languageName = await languagesPage.languageDisplayed(NEW_LANG_CODE);
    expect(languageName.trim()).to.equal(NEW_LANG_NAME);
  });

  it('should be set as Default language ', async () => {
    expect(await languagesPage.selectLanguage(languagesPage.defaultLanguageDropdown, NEW_LANG_CODE)).to.be.true;
    expect(await languagesPage.selectLanguage(languagesPage.outgoingLanguageDropdown, NEW_LANG_CODE)).to.be.true;
  });

  it('should reflect in config wizard', async () => {
    await languagesPage.goToApplication();
    const [heading, messageLanguage, appLanguage] = await commonPo.getDefaultLanguages();
    expect(heading).to.equal(`${NEW_LANG_NAME}, ${NEW_LANG_NAME}`);
    expect(messageLanguage).to.equal(NEW_LANG_NAME);
    expect(appLanguage).to.equal(NEW_LANG_NAME);
  });

  it('should add new translations', async () => {
    await addTranslations();
    await commonPo.openHamburgerMenu();
    await commonPo.openUserSettingsAndFetchProperties();
    await userSettingsElements.openEditSettings();

    // change user language
    await userSettingsElements.selectLanguage(NEW_LANG_CODE);
    await browser.waitUntil(async () => await (await commonPo.analyticsTab()).getText() === 'Analytiks');

    //check for translations in the UI
    await commonPo.goToMessages();
    await commonPo.waitForPageLoaded();
    await browser.waitUntil(async () =>
      await (await messagesPage.messagesList()).getText() === 'Geen boodskappe gevind nie'
    );
    await commonPo.goToReports();
    await browser.waitUntil(async () => await (await reportsPage.reportList()).getText() === 'Geen verslae gevind nie');
    await commonPo.goToPeople();
    await browser.waitUntil(async () => await (await contactsPage.contactList()).getText() === 'Geen mense gevind nie');
  });
});
