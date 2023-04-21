const commonPage = require('../common/common.wdio.page');

const submitButton = () => $('.btn.submit.btn-primary');
const languageDropDown = () => $('#language');

const openEditSettings = async () => {
  const links = await $('.content .configuration');
  await links.waitForDisplayed();
  await (await links.$$('.btn-link'))[1].click();
  //modals have an animation and the click might land somewhere else
  await browser.pause(500);
};

const selectLanguage = async (code) => {
  await (await languageDropDown()).waitForDisplayed();
  await browser.waitUntil(async () => (await (await languageDropDown()).getValue()).length);
  await (await languageDropDown()).selectByAttribute('value', code);
  await (await submitButton()).waitForClickable();
  await (await submitButton()).click();
  await (await submitButton()).waitForDisplayed({ timeout: 60000, reverse: true });
};

const setLanguage = async (code) => {
  await commonPage.waitForPageLoaded();
  await commonPage.openHamburgerMenu();
  await commonPage.openUserSettings();
  await openEditSettings();
  await selectLanguage(code);
};

module.exports = {
  openEditSettings,
  setLanguage,
};
