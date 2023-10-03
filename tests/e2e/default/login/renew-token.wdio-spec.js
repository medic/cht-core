
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const moment = require('moment');
const utils = require('@utils');
let expirationDateFieldName;

describe('should renew token', async () => {

  beforeEach(async () => {
    expirationDateFieldName = driver.capabilities['browserVersion'] === '90.0.4430.93' ? 'expiry' : 'expires';
    await loginPage.cookieLogin();
  });

  it('Refresh page multiple times and verify token gets renewed', async () => {
    await commonPage.waitForPageLoaded();

    for (let counter = 0; counter < 3; counter++) {
      const beforePageLoadTime = moment().add(utils.ONE_YEAR_IN_S, 'seconds');
      await browser.refresh();
      await commonPage.waitForPageLoaded();
      const afterPageLoadTime = moment().add(utils.ONE_YEAR_IN_S, 'seconds');
      const ctxExpiry = await getCtxCookieExpiry();

      expect(
        ctxExpiry.isBetween(beforePageLoadTime, afterPageLoadTime),
        `Failed for counter = ${counter}, ${ctxExpiry} ${beforePageLoadTime} ${afterPageLoadTime}`
      ).to.be.true;
    }
  });
});

const getCtxCookieExpiry = async () => {
  const userCtxCookie = await browser.getCookies('userCtx');
  const momentObj = moment.unix(userCtxCookie[0][expirationDateFieldName]);
  if (!momentObj.isValid()) {
    throw new Error(`Unable to construct moment object from cookie expiration: ${userCtxCookie}`);
  }
  return momentObj;
};
