const utils = require('../../utils');
const languagesPage = require('../../page-objects/display/languages.po');

describe('Adding new language', () => {

  beforeAll(async () => {
    await utils.resetBrowserNative();
  });

  afterEach(async () => {
    await browser.manage().addCookie({ name: 'locale', value: 'en' });
    await utils.afterEach();
  });

  it('should add a new language',async () => {
    await languagesPage.goToLanguagesTab();
    await languagesPage.openAddLanguageModal;
    await languagesPage.addNewLanguage('afr', 'Afrikaans');
    expect(await languagesPage.languageDisplayed('afr', 'Afrikaans')).toBeTrue();
  });
});
