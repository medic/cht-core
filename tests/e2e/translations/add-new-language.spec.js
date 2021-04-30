const languagesPage = require('../../page-objects/display/languages.po');
const commonPo=require('../../page-objects/common/common.po');
const utils = require('../../utils');
//const commonPo = require('../../page-objects/common/common.po');
const helper = require('../../helper');
const userSettingsElements = require('../../page-objects/user-settings/user-settings.po');

describe('Adding new language', () => {
  const addTranslations = async () => {
    await utils.addTranslations('afr',{
      'No messages found':'Geen boodskappe gevind nie',
      'No people found':'Geen mense gevind nie',
      'No reports found':'Geen verslae gevind nie',
      'Analytics': 'Analytiks'
    }); 
    await utils.resetBrowserNative();
  };

  it('should show in enabled language list', async () => {
    await languagesPage.goToLanguagesTab();    
    await languagesPage.addNewLanguage('afr', 'Afrikaans');
    const languageName = await languagesPage.languageDisplayed('afr');
    expect(languageName).toBe('Afrikaans');
  });

  it('should be set as Default language ',async () => {
    await languagesPage.goToLanguagesTab();
    await languagesPage.setDefaultLanguage('Afrikaans');
    await languagesPage.setOutgoingMessageLanguage('Afrikaans');
    await languagesPage.isLanguageSelected('#locale', 'afr');
    await languagesPage.isLanguageSelected('#locale-outgoing', 'afr');
  });

  it('should reflect in config wizard', async () => {
    languagesPage.goToApplication();
    const defaultLanguages= await commonPo.getDefaultLanguages();
    expect(defaultLanguages).toBe('Afrikaans, Afrikaans');
  });

  it('should add new translations', async () => {
    await utils.resetBrowserNative();
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
    await commonPo.goToReportsNative();
    expect(await helper.getTextFromElementNative(commonPo.reportsList)).toBe('Geen verslae gevind nie');
    await commonPo.goToPeople();
    expect(await helper.getTextFromElementNative(commonPo.contactsList)).toBe('Geen mense gevind nie');
    expect(await helper.getTextFromElementNative(commonPo.analyticsTab)).toBe('Analytiks');
  });

});
