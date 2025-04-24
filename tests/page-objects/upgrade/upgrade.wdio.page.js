const common = require('../default/common/common.wdio.page');
const utils = require('@utils');

const cancelUpgradeButton = () => $('button*=Cancel');
const deploymentInProgress = () => $('legend*=Deployment in progress');
const deploymentComplete = () => $('div*=Deployment complete');

const getInstallButtonSelector = (branch, tag) => {
  if (tag) {
    const match = tag.includes('beta') ? '*=' : '=';
    return `span${match}${tag}`;
  }
  return `span*=${utils.escapeBranchName(branch)} (`;
};

const getInstallButton = async (branch, tag) => {
  const element = $(getInstallButtonSelector(branch, tag));
  const firstParent = await element.parentElement();
  const parent = await firstParent.parentElement();
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
  const confirm = $('.modal-footer .submit.btn');
  await confirm.waitForDisplayed();
  return confirm;
};

const getCurrentVersion = async () => {
  const version = () => $('dl.horizontal dd');
  await browser.waitUntil(async () => await version().getText());
  return await version().getText();
};

const getBuild = async () => {
  const version = () => $('dl.horizontal dd:nth-child(4)');
  await browser.waitUntil(async () => await version().getText());
  return await version().getText();
};

const upgradeVersion = async (branch, tag, testFrontend=true) => {
  await goToUpgradePage();
  await expandPreReleasesAccordion();

  const installButton = await getInstallButton(branch, tag);
  await installButton.scrollIntoView({ block: 'center', inline: 'center' });
  await installButton.click();
  const confirmButton = await upgradeModalConfirm();
  await confirmButton.click();

  await cancelUpgradeButton().waitForDisplayed();
  await deploymentInProgress().waitForDisplayed();
  await deploymentInProgress().waitForDisplayed({ reverse: true, timeout: 150000 });

  if (testFrontend) {
    // https://github.com/medic/cht-core/issues/9186
    // this is an unfortunate incompatibility between current API and admin app in the old version
    await deploymentComplete().waitForDisplayed();
  }
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
  upgradeVersion,
};
