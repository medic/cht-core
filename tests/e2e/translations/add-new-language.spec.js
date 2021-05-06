const languagesPage = require('../../page-objects/display/languages.po');
const commonPo=require('../../page-objects/common/common.po');
const utils = require('../../utils');
const helper = require('../../helper');
const userSettingsElements = require('../../page-objects/user-settings/user-settings.po');

describe('Adding new language', () => {
  const addTranslations = async () => {
    await utils.addTranslations('afr',{
      'No messages found':'Geen boodskappe gevind nie',
      'No contacts found':'Geen mense gevind nie',
      'reports.none':'Geen verslae gevind nie',
      'Analytics': 'Analytiks'
    });
    await utils.resetBrowserNative();
  };

  afterAll(async () => {
    await utils.afterEach();
    await browser.manage().addCookie({ name: 'locale', value: 'en' });
  });

  it('should show in enabled language list', async () => {
    await languagesPage.goToLanguagesTab();
    await languagesPage.addNewLanguage('afr', 'Afrikaans');
    const languageName = await languagesPage.languageDisplayed('afr');
    expect(languageName).toBe('Afrikaans');
  });

  it('should be set as Default language ',async () => {
    await languagesPage.setDefaultLanguage('Afrikaans');
    await languagesPage.setOutgoingMessageLanguage('Afrikaans');
    expect(await languagesPage.isLanguageSelected('#locale', 'afr')).toBe('true');
    expect(await languagesPage.isLanguageSelected('#locale-outgoing', 'afr')).toBe('true');
  });

  it('should reflect in config wizard', async () => {
    languagesPage.goToApplication();
    const [heading, messageLanguage, appLanguage]= await commonPo.getDefaultLanguages();
    expect(heading).toBe('Afrikaans, Afrikaans');
    expect(messageLanguage).toBe('Afrikaans');
    expect(appLanguage).toBe('Afrikaans');
  });

  it('should add new translations', async () => {
    await addTranslations();
    await commonPo.openMenuNative();
    await commonPo.checkUserSettings();

    // open user settings modal
    await userSettingsElements.openEditSettings();

    // change language
    await helper.selectDropdownByValue(userSettingsElements.getLanguageField(), 'afr');
    await helper.clickElementNative(userSettingsElements.getSubmitButton());
    await commonPo.goToMessagesNative();

    //check fro translations
    expect(await helper.getTextFromElementNative(commonPo.messagesList)).toBe('Geen boodskappe gevind nie');
    await utils.resetBrowserNative();
    await commonPo.goToReportsNative();
    expect(await helper.getTextFromElementNative(commonPo.reportsList)).toBe('Geen verslae gevind nie');
    await commonPo.goToPeople();
    expect(await helper.getTextFromElementNative(commonPo.contactsList)).toBe('Geen mense gevind nie');
    expect(await helper.getTextFromElementNative(commonPo.analyticsTab)).toBe('Analytiks');
  });
});
