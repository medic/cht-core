const utils = require('../../../utils');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');

describe('Enabling/disabling languages', () => {
  before(async () => {
    const settingsUpdate = {
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
    await utils.updateSettings(settingsUpdate, true);
    await browser.waitUntil(async () => {
      const settings = await utils.getSettings();
      console.log("settings.languages", settings.languages);
      return settings.languages.every(language => settingsUpdate.languages.findIndex(l => l.locale === language.locale) > -1);
    });
    await browser.refresh();
  });

  after(async () => {
    await utils.revertSettings(true);
  });

  it('should disable a language', async () => {
    let locales = await loginPage.getAllLocales();
    console.log("locales", locales);
    expect(locales).to.deep.equal([
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español (Spanish)' },
      { code: 'fr', name: 'Français (French)' },
    ]);
    await loginPage.cookieLogin();


    await browser.url('/admin/#/display/languages');
    await $('.tab-content > #language-accordion > .panel').waitForDisplayed();
    const languages = await $$('.tab-content > #language-accordion > .panel');
    console.log('languages', languages.length);

    const esLanguageHeader = await $('#locale-es.panel-heading a[data-target="#locale-es-body"]');
    await esLanguageHeader.click();
    const esLanguageAccordion = await $('#locale-es-body');
    await (await esLanguageAccordion.$('button=Disable')).click();
    await browser.waitUntil(async () => {
      const settings = await utils.getSettings();
      const esLanguage = settings.languages.find(language => language.locale === 'es');
      return esLanguage.enabled === false;
    });

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
    ]);

    const logoutButton = await $('span=Log out');
    await logoutButton.click();
    await loginPage.loginButton().waitForDisplayed();
    await browser.reloadSession();
    await browser.url('/');

    locales = await loginPage.getAllLocales();
    console.log("locales", locales);
    expect(locales).to.deep.equal([
      { code: 'en', name: 'English' },
      { code: 'fr', name: 'Français (French)' },
    ]);

    // click on one language
    // enable/disable it
    // check in app_settings.languages it's getting updated
    // check the login page only has the enabled languages
  });
});
