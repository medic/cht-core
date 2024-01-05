const commonPage = require('@page-objects/default/common/common.wdio.page');
const modalPage = require('@page-objects/default/common/modal.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const constants = require('@constants');

describe('Browser Compatibility Modal', () => {
  const newChromeVersion =
    'Mozilla/5.0 (Linux; Android 13; IN2010) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/118.0.5993.112 Mobile Safari/537.36';

  const outdatedChromeVersion =
    'Mozilla/5.0 (Linux; Android 13; IN2010) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/74.0.5993.112 Mobile Safari/537.36';

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

  it('should not display the browser compatibility modal for updated Chrome version', async () => {
    await browser.emulateDevice({
      viewport: {
        width: 600,
        height: 960,
        isMobile: true,
        hasTouch: true,
      },
      userAgent: newChromeVersion,
    });

    await commonPage.goToBase();
    await modalPage.checkModalHasClosed();
  });

  it('should display the browser compatibility modal for outdated Chrome version', async () => {
    await browser.emulateDevice({
      viewport: {
        width: 600,
        height: 960,
        isMobile: true,
        hasTouch: true,
      },
      userAgent: outdatedChromeVersion,
    });

    await commonPage.goToBase();
    const modal = await modalPage.getModalDetails();
    expect(modal.header).to.equal('Contact Supervisor');
    await modalPage.submit();
  });
});
