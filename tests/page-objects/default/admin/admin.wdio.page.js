const utils = require('../../../utils');

const adminNavbarLogo = () => $('.navbar-header .navbar-brand');
const languagesPanel = () => $('.tab-content > #language-accordion > .panel');
const localePanelHeader = (locale) => $(`#locale-${locale}.panel-heading a[data-target="#locale-${locale}-body"]`);
const localePanelBody = (locale) => $(`#locale-${locale}-body`);
const logoutButton = () => $('span=Log out');

const toggleLanguage = async (locale, shouldEnable) => {
  await languagesPanel().waitForDisplayed();
  await (await localePanelHeader(locale)).click();
  const languageAccordion = await localePanelBody(locale);
  await languageAccordion.waitForDisplayed();
  await utils.delayPromise(500); // wait for animation to complete
  const buttonLabel = shouldEnable ? 'Enable' : 'Disable';
  const button = languageAccordion.$(`span=${buttonLabel}`);
  await button.waitForClickable();
  await (await button).click();
  await browser.waitUntil(async () => {
    const settings = await utils.getSettings();
    const language = settings.languages.find(language => language.locale === locale);
    return language.enabled === shouldEnable;
  });
};

const disableLanguage = (locale) => toggleLanguage(locale, false);
const enableLanguage = (locale) => toggleLanguage(locale, true);

const logout = async () => (await logoutButton()).click();

module.exports = {
  adminNavbarLogo,
  disableLanguage,
  enableLanguage,
  logout,
};
