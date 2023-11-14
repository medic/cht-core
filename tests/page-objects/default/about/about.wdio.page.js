const userName = () => $('label=User name');
const partners = () => $('.partners');
const version = () => $('.*=Version');
const RELOAD_BUTTON = '.about.page .mat-primary';

const getPartnerImage = async (name) => {
  await (await partners()).waitForDisplayed();
  const partnerContainer = await (await partners()).$(`.partner-image[title="${name}"]`);
  await partnerContainer.waitForDisplayed();
  const partnerImage = await partnerContainer.$('img');
  return partnerImage.getAttribute('src');
};

const getVersion = async () => {
  await (await version()).waitForDisplayed();
  return await (await version()).getText();
};

const reload = async () => {
  await (await $(RELOAD_BUTTON)).waitForClickable();
  await (await $(RELOAD_BUTTON)).click();
  await (await $(RELOAD_BUTTON)).waitForDisplayed();
};

module.exports = {
  userName,
  partners,
  getPartnerImage,
  getVersion,
  RELOAD_BUTTON,
  reload,
};
