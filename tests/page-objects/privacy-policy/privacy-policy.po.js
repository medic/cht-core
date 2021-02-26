const helper = require('../../helper');
const utils = require('../../utils');
const commonElements = require('../common/common.po');

const getPrivacyPolicyFromPage = async () => {
  await browser.get(utils.getBaseUrl() + 'privacy-policy');
  const privacyPolicyContainer = element(by.css('.privacy-policy.configuration'));
  await helper.waitElementToBeVisibleNative(privacyPolicyContainer);
  return helper.getTextFromElementNative(privacyPolicyContainer);
};

const getPrivacyPolicyFromOverlay = async () => {
  await helper.waitElementToPresentNative(element(by.css('#privacy-policy-wrapper')));
  return helper.getTextFromElementNative(element(by.css('#privacy-policy-wrapper .html-content')));
};

const acceptPrivacyPolicy = async () => {
  const acceptButton = element(by.css('#privacy-policy-wrapper .btn'));
  await helper.clickElementNative(acceptButton);
  await commonElements.calmNative();
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
  getPrivacyPolicyFromPage,
  getPrivacyPolicyFromOverlay,
  acceptPrivacyPolicy,
  updatePrivacyPolicy,
};
