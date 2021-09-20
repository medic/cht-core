// const helper = require('../../helper');
const utils = require('../../utils');
// const commonElements = require('../common/common.wdio.page.js');
const privacyWrapper = () => $('#privacy-policy-wrapper');
const pivbtn = async () => (await privacyWrapper()).$('.btn');
const privacyConfig = () => $('.privacy-policy.configuration');

const goToPrivacyPolicyConfig = async () => {
  await browser.url(utils.getBaseUrl() + 'privacy-policy');
  const privacyPolicyContainer = await privacyConfig();
  await privacyPolicyContainer.waitForDisplayed();
  return privacyPolicyContainer.getText();
};

const getPrivacyPolicyFromOverlay = async () => {
  (await privacyWrapper()).waitForDisplayed();
  return (await privacyWrapper()).getText();
};

const acceptPrivacyPolicy = async () => {
  return (await pivbtn()).click();
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
