const userName = () => $('label=User name');
const partners = () => $('.partners');
const version = () => $('[test-id="about-version"]');
const aboutCard = () => $('mat-card-title*=About');

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

module.exports = {
  userName,
  partners,
  getPartnerImage,
  getVersion,
  aboutCard,
};
