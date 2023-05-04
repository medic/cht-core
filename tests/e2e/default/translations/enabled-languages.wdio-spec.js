const utils = require('../../../utils');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');

describe('Enabling/disabling languages', () => {
  before(async () => {
    const settings = {
      languages: [
        {
          locale: 'en',
          enabled: true,
        },
        {
          locale: 'es',
          enabled: true,
        },
        {
          locale: 'fr',
          enabled: true,
        },
      ],
    };
    await utils.updateSettings(settings, true);
    await browser.refresh();
  });

  after(async () => {
    await utils.revertSettings(true);
  });

  const toggleLanguage = async (locale, shouldEnable) => {
    await $('.tab-content > #language-accordion > .panel').waitForDisplayed();
    const languageHeader = await $(`#locale-${locale}.panel-heading a[data-target="#locale-${locale}-body"]`);
    await languageHeader.click();
    const languageAccordion = await $(`#locale-${locale}-body`);
    await languageAccordion.waitForDisplayed();
    const buttonLabel = shouldEnable ? 'Enable' : 'Disable';
    await (await languageAccordion.$(`span=${buttonLabel}`)).click();
    await browser.waitUntil(async () => {
      const settings = await utils.getSettings();
      const language = settings.languages.find(language => language.locale === locale);
      return language.enabled === shouldEnable;
    });
  };

  const disableLanguage = (locale) => toggleLanguage(locale, false);
  const enableLanguage = (locale) => toggleLanguage(locale, true);

  it('should disable a language and enable another', async () => {
    // assert English, Spanish, and French are available on the login page
    let locales = await loginPage.getAllLocales();
    expect(locales).to.deep.equal([
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español (Spanish)' },
      { code: 'fr', name: 'Français (French)' },
    ]);
    await loginPage.cookieLogin();

    // open admin app on the languages configuration tab
    await browser.url('/admin/#/display/languages');

    // disable Spanish
    await disableLanguage('es');

    // enable Swahili
    await enableLanguage('sw');

    // assert:
    //   - Spanish has been disabled in the app_settings
    //   - Swahili has been enabled in the app_settings
    const settings = await utils.getSettings();
    expect(settings.languages).to.deep.equal([
      {
        locale: 'en',
        enabled: true,
      },
      {
        locale: 'es',
        enabled: false,
      },
      {
        locale: 'fr',
        enabled: true,
      },
      {
        locale: 'sw',
        enabled: true,
      },
    ]);

    // assert:
    //   - Spanish is not available on the login page
    //   - Swahili is available on the login page
    const logoutButton = await $('span=Log out');
    await logoutButton.click();
    await loginPage.loginButton().waitForDisplayed();
    await browser.reloadSession();
    await browser.url('/');
    locales = await loginPage.getAllLocales();
    expect(locales).to.deep.equal([
      { code: 'en', name: 'English' },
      { code: 'fr', name: 'Français (French)' },
      { code: 'sw', name: 'Kiswahili (Swahili)' },
    ]);
  });
});
