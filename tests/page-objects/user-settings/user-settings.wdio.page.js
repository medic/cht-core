const commonPage = require('../common/common.wdio.page');

const openEditSettings = async () => {
  const links = await $('.content .configuration');
  await links.waitForDisplayed();
  await links.$$('.btn-link')[1].click();
  // modals have an animation and the click might land somewhere else
  await browser.pause(500);
};

const selectLanguage = async (code) => {
  const languageDropDown = await $('#language');
  await languageDropDown.selectByAttribute('value', code);
  const submiButton = await $('.btn.submit.btn-primary');
  await submiButton.click();
  await submiButton.waitForDisplayed({reverse:true});
  await commonPage.waitForLoaderToDisappear();
};

module.exports = {
  openEditSettings,
  selectLanguage,
};
