const commonPage = require('@page-objects/default/common/common.wdio.page');
const modalPage = require('@page-objects/default/common/modal.wdio.page');

const languageDropDown = () => $('#language');

const openEditSettings = async () => {
  await commonPage.openEditProfile();
  //modals have an animation and the click might land somewhere else
  await browser.pause(500);
};

const selectLanguage = async (code) => {
  console.log(`Attempting to select language: ${code}`);
  await (await languageDropDown()).waitForDisplayed();
  await browser.waitUntil(
    async () => (await (await languageDropDown()).getValue()).length,
    {
      timeout: 30000,
      timeoutMsg: 'Language dropdown value not populated within timeout',
    }
  );
  console.log(`Selecting language value: ${code}`);
  await (await languageDropDown()).selectByAttribute('value', code);
  console.log('Waiting for submit button to be clickable');
  await modalPage.submit(30000);
  console.log(`Successfully selected language: ${code}`);
};

const setLanguage = async (code) => {
  await commonPage.waitForPageLoaded();
  await commonPage.openHamburgerMenu();
  await commonPage.openUserSettings();
  await openEditSettings();
  await selectLanguage(code);
  await browser.pause(1000); // increased pause to wait for the elements to change translations
};

module.exports = {
  openEditSettings,
  setLanguage,
};
