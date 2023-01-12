const utils = require('../../../utils');
const commonElements = require('../common/common.wdio.page');
const privacyWrapper = () => $('#privacy-policy-wrapper');
const privacyAccept = async () => (await privacyWrapper()).$('.btn');
const privacyConfig = () => $('.privacy-policy.configuration');

const goToPrivacyPolicyConfig = async () => {
  await browser.url(utils.getBaseUrl() + 'privacy-policy');
  await (await privacyConfig()).waitForDisplayed();
};

const getPrivacyPolicyFromOverlay = async () => {
  (await privacyWrapper()).waitForDisplayed();
  return (await privacyWrapper()).getText();
};

const acceptPrivacyPolicy = async () => {
  return (await privacyAccept()).click();
};

const updatePrivacyPolicy = async (updatedPolicy) => {
  const existingPolicy = await utils.getDoc(updatedPolicy._id);
  await utils.saveDoc({ ...existingPolicy, ...updatedPolicy });
};

const waitForPolicy = async (elm, { header, paragraph, language }) => {
  const timeoutOpts = {
    timeout: 10 * 1000,
    timeoutMsg: `Timed out waiting for ${language} Privacy Policy to Display`
  };
  await browser.waitUntil(async () => {
    const wrapperText = await (await elm).getText();
    return wrapperText.includes(header) && wrapperText.includes(paragraph);
  }, timeoutOpts);
};

const waitAndAcceptPolicy = async (elm, { header, paragraph, language }, sync = false) => {
  await waitForPolicy(elm, { header, paragraph, language });
  await acceptPrivacyPolicy();
  const timeoutOpts = {
    timeout: 15 * 1000,
    timeoutMsg: `Timed out waiting for messages tag to be displayed`
  };
  await browser.waitUntil(async () => (await commonElements.messagesTab()).isDisplayed(), timeoutOpts);
  if (sync) {
    await commonElements.sync();
  }
};

module.exports = {
  goToPrivacyPolicyConfig,
  getPrivacyPolicyFromOverlay,
  acceptPrivacyPolicy,
  updatePrivacyPolicy,
  privacyWrapper,
  privacyConfig,
  waitForPolicy,
  waitAndAcceptPolicy
};
