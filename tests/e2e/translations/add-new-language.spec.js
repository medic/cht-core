const utils = require('../../utils');
const languagesPage = require('../../page-objects/display/languages.po');
const commonPo=require('../../page-objects/common/common.po');

describe('Adding new language', () => {

  beforeAll(async () => {
    await utils.resetBrowserNative();
  });

  afterEach(async () => {
    //await browser.manage().addCookie({ name: 'locale', value: 'en' });
    await utils.afterEach();
  });

  it('should show in enabled language list',async () => {
    await languagesPage.goToLanguagesTab();
    await languagesPage.openAddLanguageModal;
    await languagesPage.addNewLanguage('afr', 'Afrikaans');
    expect(await languagesPage.languageDisplayed('afr', 'Afrikaans')).toBeTrue();
  });

  it('should be set as Default language ',async () => {
    await languagesPage.setDefaultLanguage('Afrikans');
    await languagesPage.setOutgoingMessageLanguage('Africans');
    await languagesPage.isLanguageSelected('#locale', 'afr');
    await languagesPage.isLanguageSelected('#locale-outgoing', 'afr');
  });

  it('should reflect in config wizard', async () => {
    const {defaultLanguage, messageLanguage} = await commonPo.getDefaultLanguages();
    expect(defaultLanguage).toBe('Afrikaans');
    expect(messageLanguage).toBe('Afrikaans');
  });

});
