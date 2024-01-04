const commonPage = require('@page-objects/default/common/common.wdio.page');
const modalPage = require('@page-objects/default/common/modal.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const constants = require('@constants');

describe('Browser Compatibility Modal', () => {
  const outdatedChrome = 'Mozilla/5.0 (Linux; Android 13; IN2010) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/74.0.5993.112 Mobile Safari/537.36';

  const newChrome = 'Mozilla/5.0 (Linux; Android 13; IN2010) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/95.0.5993.112 Mobile Safari/537.36';

  beforeEach(async () => {
    await loginPage.login({
      username: constants.USERNAME,
      password: constants.PASSWORD,
      createUser: true,
    });
  });

  afterEach(async () => {
    await browser.deleteCookies();
    await browser.url('/');
  });

  it('should display the browser compatibility modal for outdated Chrome versions', async () => {
    await browser.emulateDevice({
      viewport: {
        width: 600,
        height: 960,
        isMobile: true,
        hasTouch: true,
      },
      userAgent: outdatedChrome,
    });

    const currentUserAgent = await browser.execute(() => navigator.userAgent);
    console.log('Current User Agent:', currentUserAgent);

    await commonPage.goToBase();
    const modal = await modalPage.getModalDetails();
    expect(modal.header).to.equal('Contact Supervisor');
    await modalPage.submit();
  });

  it('should not display the browser compatibility modal for updated Chrome versions', async () => {
    await browser.emulateDevice({
      viewport: {
        width: 600,
        height: 960,
        isMobile: true,
        hasTouch: true,
      },
      userAgent: newChrome,
    });

    const currentUserAgent = await browser.execute(() => navigator.userAgent);
    console.log('Current User Agent:', currentUserAgent);
    await commonPage.goToBase();
  });
});
