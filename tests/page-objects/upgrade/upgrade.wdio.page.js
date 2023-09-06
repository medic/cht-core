const common = require('../default/common/common.wdio.page');
const utils = require('@utils');

const cancelUpgradeButton = () => $('button*=Cancel');
const deploymentInProgress = () => $('legend*=Deployment in progress');
const deploymentComplete = () => $('div*=Deployment complete');

const getInstallButton = async (branch, tag) => {
  let selector = `span*=${branch} (`;
  if (tag) {
    selector = tag.includes('beta') ? `span*=${tag}` : `span=${tag}`;
  }
  const element = await $(selector);
  const parent = await (await element.parentElement()).parentElement();
  return await parent.$('.btn-primary');
};

const goToUpgradePage = async () => {
  await browser.url('/admin/#/upgrade');
  await common.waitForLoaders();
};

const expandPreReleasesAccordion = async () => {
  const toggle = await $('.upgrade-accordion .accordion-toggle');
  await toggle.waitForDisplayed();
  await toggle.click();
  // wait for accordion animation
  await utils.delayPromise(500);
};

const upgradeModalConfirm = async () => {
  const confirm = await $('.modal-footer .submit.btn');
  await confirm.waitForDisplayed();
  return confirm;
};

const getCurrentVersion = async () => {
  const version = () => $('.material .cell p');
  await browser.waitUntil(async () => await (await version()).getText());
  return await (await version()).getText();
};

const getBuild = async () => {
  const version = () => $('dl.horizontal dd:nth-child(4)');
  await browser.waitUntil(async () => await (await version()).getText());
  return await (await version()).getText();
};

module.exports = {
  cancelUpgradeButton,
  deploymentInProgress,
  deploymentComplete,
  getCurrentVersion,
  getInstallButton,
  goToUpgradePage,
  expandPreReleasesAccordion,
  upgradeModalConfirm,
  getBuild,
};
