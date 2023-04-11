const submiButton = () => $('.btn.submit.btn-primary');

const openEditSettings = async () => {
  const links = await $('.content .configuration');
  await links.waitForDisplayed();
  await (await links.$$('.btn-link'))[1].click();
  //modals have an animation and the click might land somewhere else
  await browser.pause(500);
};

const selectLanguage = async (code) => {
  const languageDropDown = () => $('#language');
  await browser.waitUntil(async () => await (await languageDropDown()).getValue() === 'en');
  await (await languageDropDown()).selectByAttribute('value', code);
  await (await submiButton()).click();
  await (await submiButton()).waitForDisplayed({timeout:60000, reverse:true});
};

module.exports = {
  openEditSettings,
  selectLanguage,
};
