const submiButton = () => $('.btn.submit.btn-primary');

const openEditSettings = async () => {
  const links = await $('.content .configuration');
  await links.waitForDisplayed();
  await links.$$('.btn-link')[1].click();
  //modals have an animation and the click might land somewhere else
  await browser.pause(500);
};

const selectLanguage = async (code) => {
  const languageDropDown = await $('#language');
  await browser.waitUntil(async () => await languageDropDown.getValue() === 'en');
  await languageDropDown.selectByAttribute('value', code);
  await (await submiButton()).click();
  await (await submiButton()).waitForDisplayed({reverse:true});
};

module.exports = {
  openEditSettings,
  selectLanguage,
};
