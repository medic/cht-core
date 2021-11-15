const languagesPage = require('../../page-objects/display/languages.wdio.page');
const commonPo = require('../../page-objects/common/common.wdio.page');
const utils = require('../../utils');
const userSettingsElements = require('../../page-objects/user-settings/user-settings.wdio.page');
const contactsPage = require('../../page-objects/contacts/contacts.wdio.page');
const reportsPage = require('../../page-objects/reports/reports.wdio.page');
const loginPage = require('../../page-objects/login/login.wdio.page');
const { expect } = require ('chai');

describe('Adding new language', () => {
  const addTranslations = async () => {
    await utils.addTranslations('afr',{
      'No messages found':'Geen boodskappe gevind nie',
      'No contacts found':'Geen mense gevind nie',
      'reports.none':'Geen verslae gevind nie',
      'Analytics': 'Analytiks'
    });
    await browser.refresh();
  };

  before(async () => await loginPage.cookieLogin());

  after(async () => {
    await browser.setCookies({ name: 'locale', value: 'en' });
    await browser.refresh();
  });

  it('should show in enabled language list', async () => {
    await languagesPage.goToLanguagesTab();
    await languagesPage.addNewLanguage('afr', 'Afrikaans');
    const languageName = await languagesPage.languageDisplayed('afr');
    expect(languageName.trim()).to.equal('Afrikaans');
  });

  it('should be set as Default language ',async () => {
    expect(await languagesPage.selectLanguage(languagesPage.defaultLanguageDropdown, 'afr')).to.be.true;
    expect(await languagesPage.selectLanguage(languagesPage.outgoingLanguageDropdown, 'afr')).to.be.true;
  });

  it('should reflect in config wizard', async () => {
    await languagesPage.goToApplication();
    const [heading, messageLanguage, appLanguage]= await commonPo.getDefaultLanguages();
    expect(heading).to.equal('Afrikaans, Afrikaans');
    expect(messageLanguage).to.equal('Afrikaans');
    expect(appLanguage).to.equal('Afrikaans');
  });

  it('should add new translations', async () => {
    await addTranslations();
    await commonPo.openHamburgerMenu();
    await commonPo.openUserSettingsAndFetchProperties();
    await userSettingsElements.openEditSettings();

    // change language
    await userSettingsElements.selectLanguage('afr');
    expect(await (await commonPo.analyticsTab()).getText()).to.equal('Analytiks');

    //check for translations
    await commonPo.goToMessages();
    await commonPo.waitForPageLoaded();
    expect(await (await commonPo.messagesList()).getText()).to.equal('Geen boodskappe gevind nie');
    await commonPo.goToReports();
    expect(await (await reportsPage.reportList()).getText()).to.equal('Geen verslae gevind nie');
    await commonPo.goToPeople();
    expect(await (await contactsPage.contactList()).getText()).to.equal('Geen mense gevind nie');
  });
});
