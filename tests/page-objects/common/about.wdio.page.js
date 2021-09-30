const userName = async () => await (await $('dt=User name')).nextElement();
const partners = () => $('.partners');

const getPartnerImage = async (name) => {
  await (await partners()).waitForDisplayed({ timeout: 2000 });
  const partnerContainer = await (await partners()).$(`.partner-image[title="${name}"]`);
  await partnerContainer.waitForDisplayed({ timeout: 2000 });
  const partnerImage = await partnerContainer.$('img');
  return partnerImage.getAttribute('src');
};

module.exports = {
  userName,
  getPartnerImage,
};
