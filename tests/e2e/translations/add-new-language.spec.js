const languagesPage = require('../../page-objects/display/languages.po');
const commonPo=require('../../page-objects/common/common.po');

describe('Adding new language', () => {

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

});
