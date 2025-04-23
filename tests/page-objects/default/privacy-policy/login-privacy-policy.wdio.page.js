const privacyContent = () => $('#privacy-policy-content');
const backButtons = () => $$('a.back-button');

const topBackButton = async () => {
  return (await backButtons())[0];
};

const bottomBackButton = async () => {
  return (await backButtons())[1];
};

const scrollToBottom = async () => {
  await (await bottomBackButton()).scrollIntoView();
};

const goBackToLoginPage = async (backButton) => {
  await (backButton).click();
};

module.exports = {
  privacyContent,
  topBackButton,
  bottomBackButton,
  scrollToBottom,
  goBackToLoginPage
};
