const commonPage = require('@page-objects/default/common/common.wdio.page');
const modalPage = require('@page-objects/default/common/modal.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');

describe('Browser Compatibility Modal', () => {
  const ANDROID_VERSION = '13';
  const SUPPORTED_CHROME_VERSION = '118.0.5993.112';
  const OUTDATED_CHROME_VERSION = '91.0.5993.112';

  beforeEach(async () => {
    await loginPage.cookieLogin();
  });

  afterEach(async () => {
    await commonPage.reloadSession();
  });

  it('should not display the browser compatibility modal for updated Chrome version', async () => {
    const userAgent = `Mozilla/5.0 (Linux; Android ${ANDROID_VERSION}; `+
      `IN2010) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${SUPPORTED_CHROME_VERSION} Mobile Safari/537.36`;

    await browser.emulate('userAgent', userAgent);

    await commonPage.goToBase();
    await modalPage.checkModalHasClosed();
  });

  it('should display the browser compatibility modal for outdated Chrome version', async () => {
    const userAgent = `Mozilla/5.0 (Linux; Android ${ANDROID_VERSION}; ` +
      `IN2010) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${OUTDATED_CHROME_VERSION} Mobile Safari/537.36`;

    await browser.emulate('userAgent', userAgent);

    await commonPage.goToBase();
    const modal = await modalPage.getModalDetails();
    expect(modal.header).to.equal('Contact Supervisor');
    await modalPage.submit();
  });
});
