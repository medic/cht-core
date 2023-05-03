const isEqual = require('lodash/isEqual');
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
    await browser.waitUntil(async () => {
      const { languages } = await utils.getSettings();
      return isEqual(languages, settings.languages);
    });
    await browser.refresh();
  });

  after(async () => {
    await utils.revertSettings(true);
  });

  it('should disable a language', async () => {
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
    await $('.tab-content > #language-accordion > .panel').waitForDisplayed();
    const esLanguageHeader = await $('#locale-es.panel-heading a[data-target="#locale-es-body"]');
    await esLanguageHeader.click();
    const esLanguageAccordion = await $('#locale-es-body');
    await (await esLanguageAccordion.$('button=Disable')).click();
    await browser.waitUntil(async () => {
      const settings = await utils.getSettings();
      const esLanguage = settings.languages.find(language => language.locale === 'es');
      return esLanguage.enabled === false;
    });

    // enable Swahili
    await $('.tab-content > #language-accordion > .panel').waitForDisplayed();
    const swLanguageHeader = await $('#locale-sw.panel-heading a[data-target="#locale-sw-body"]');
    await swLanguageHeader.click();
    const swLanguageAccordion = await $('#locale-sw-body');
    const ddd = await swLanguageAccordion.$('span=Enable');
    await ddd.waitForDisplayed();
    await ddd.click();
    // await (await swLanguageAccordion.$('button=Enable')).click();
    await browser.waitUntil(async () => {
      const settings = await utils.getSettings();
      const swLanguage = settings.languages.find(language => language.locale === 'sw');
      return swLanguage.enabled === true;
    });

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
