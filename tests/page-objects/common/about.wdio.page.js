const userName = () => $('dt=User name');
const partners = () => $('.partners');

const getPartnerImage = async (name) => {
  await (await partners()).waitForDisplayed();
  const partnerContainer = await (await partners()).$(`.partner-image[title="${name}"]`);
  await partnerContainer.waitForDisplayed();
  const partnerImage = await partnerContainer.$('img');
  return partnerImage.getAttribute('src');
};

module.exports = {
  userName,
  getPartnerImage,
};
