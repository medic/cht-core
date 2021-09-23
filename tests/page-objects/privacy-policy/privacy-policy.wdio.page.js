const utils = require('../../utils');
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

const updatePrivacyPolicy = async (docId, policyKey, policyText) => {
  const policiesDoc = await utils.getDoc(docId);
  policiesDoc.privacy_policies.fr = policyKey;
  policiesDoc._attachments[policyKey] = {
    content_type: 'text/html',
    data: Buffer.from(policyText).toString('base64'),
  };
  await utils.saveDoc(policiesDoc);
};

module.exports = {
  goToPrivacyPolicyConfig,
  getPrivacyPolicyFromOverlay,
  acceptPrivacyPolicy,
  updatePrivacyPolicy,
  privacyWrapper,
  privacyConfig
};
