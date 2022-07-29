const common = require('../../page-objects/common/common.wdio.page');
const auth = require('../../auth')();
const utils = require('../../utils');

const { BRANCH } = process.env;
const loginPage = require('../../page-objects/login/login.wdio.page');

const getInstallButton = async () => {
  for (const element of await $$('span.release-name')) {
    const text = await element.getText();
    if (text.includes(BRANCH)) {
      const parent = await (await element.parentElement()).parentElement();
      return await parent.$('.btn-primary');
    }
  }

  throw new Error(`Could not find release ${BRANCH}`);
};

describe('Performing an upgrade', () => {
  before(async () => {
    await loginPage.cookieLogin({ ...auth, createUser: false });
  });

  it('should upgrade', async () => {
    await browser.url('/admin/#/upgrade');
    await common.waitForLoaders();
    const toggle = await $('.upgrade-accordion .accordion-toggle');
    await toggle.waitForDisplayed();
    await toggle.click();

    await utils.delayPromise(1000);

    const installButton = await getInstallButton();

    await installButton.click();
    const confirm = await $('.modal-footer .submit.btn');
    await confirm.click();

    await (await $('button*=Cancel')).waitForDisplayed();
    await (await $('legend*=Deployment in progress')).waitForDisplayed();
    await (await $('legend*=Deployment in progress')).waitForDisplayed({ reverse: true, timeout: 20000 });

    await (await $('div*=Deployment complete')).waitForDisplayed();
    const currentVersion = await $('dl.horizontal dd');
    expect(await currentVersion.getText()).to.include(BRANCH);
  });
});
