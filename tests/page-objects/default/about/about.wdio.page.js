const userName = () => $('label=User name');
const partners = () => $('.partners');
const version = () => $('.material .cell p');

const getPartnerImage = async (name) => {
  await (await partners()).waitForDisplayed();
  const partnerContainer = await (await partners()).$(`.partner-image[title="${name}"]`);
  await partnerContainer.waitForDisplayed();
  const partnerImage = await partnerContainer.$('img');
  return partnerImage.getAttribute('src');
};

const getVersion = async () => {
  await browser.waitUntil(async () => await (await version()).getText());
  return await (await version()).getText();
};

module.exports = {
  userName,
  partners,
  getPartnerImage,
  getVersion,
};
