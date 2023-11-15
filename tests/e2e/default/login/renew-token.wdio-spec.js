
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const moment = require('moment');
const utils = require('@utils');

describe('should renew token', () => {

  beforeEach(async () => {
    await loginPage.cookieLogin();
    await commonPage.waitForPageLoaded();
  });

  it('Refresh page multiple times and verify token gets renewed', async () => {
    for (let counter = 0; counter < 3; counter++) {
      const beforePageLoadTime = moment().add(utils.ONE_YEAR_IN_S, 'seconds').startOf('second');
      await browser.refresh();
      await commonPage.waitForPageLoaded();
      const afterPageLoadTime = moment().add(utils.ONE_YEAR_IN_S, 'seconds').endOf('second');
      const ctxExpiry = await getCtxCookieExpiry();

      expect(
        ctxExpiry.isBetween(beforePageLoadTime, afterPageLoadTime, 'second', '[]'),
        `Failed for counter = ${counter}, ${ctxExpiry} ${beforePageLoadTime} ${afterPageLoadTime}`
      ).to.be.true;
      await browser.pause(1000);
    }
  });
});

const getCtxCookieExpiry = async () => {
  const userCtxCookie = await browser.getCookies('userCtx');
  const momentObj = moment.unix(userCtxCookie[0].expiry);
  if (!momentObj.isValid()) {
    throw new Error(`Unable to construct moment object from cookie expiration: ${userCtxCookie}`);
  }
  return momentObj;
};
