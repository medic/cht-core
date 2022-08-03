const common = require('../../page-objects/common/common.wdio.page');
const auth = require('../../auth')();
const utils = require('../../utils');

const { BRANCH, BUILD_NUMBER } = process.env;
const loginPage = require('../../page-objects/login/login.wdio.page');

const getInstallButton = async () => {
  for (const element of await $$('span.release-name')) {
    const text = await element.getText();
    if (text.startsWith(`${BRANCH} (`)) {
      const parent = await (await element.parentElement()).parentElement();
      return await parent.$('.btn-primary');
    }
  }

  throw new Error(`Could not find release ${BRANCH}`);
};

const getDdocs = async () => {
  const result = await utils.requestOnMedicDb({
    path: '/_all_docs',
    qs: {
      start_key: JSON.stringify('_design'),
      end_key: JSON.stringify('_design\ufff0'),
      include_docs: true,
    },
  });

  return result.rows.map(row => row.doc);
};

describe('Performing an upgrade', () => {
  before(async () => {
    await loginPage.cookieLogin({ ...auth, createUser: false });
  });

  it('should upgrade to current branch', async () => {
    await browser.url('/admin/#/upgrade');
    await common.waitForLoaders();
    const toggle = await $('.upgrade-accordion .accordion-toggle');
    await toggle.waitForDisplayed();
    await toggle.click();

    // wait for accordion animation
    await utils.delayPromise(500);

    const installButton = await getInstallButton();

    await installButton.click();
    const confirm = await $('.modal-footer .submit.btn');
    await confirm.click();

    await (await $('button*=Cancel')).waitForDisplayed();
    await (await $('legend*=Deployment in progress')).waitForDisplayed();
    await (await $('legend*=Deployment in progress')).waitForDisplayed({ reverse: true, timeout: 100000 });

    await (await $('div*=Deployment complete')).waitForDisplayed();

    const currentVersion = await (await $('dl.horizontal dd')).getText();
    expect(currentVersion).to.include(`${BRANCH}.${BUILD_NUMBER}`);

    // there should be no staged ddocs
    const ddocs = await getDdocs();
    const staged = ddocs.filter(ddoc => ddoc._id.includes('staged'));
    expect(staged.length).to.equal(0);

    ddocs.forEach(ddoc => expect(ddoc.version).to.equal(currentVersion));
  });
});
