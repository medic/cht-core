
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const moment = require('moment');
const browserPage = require('../../../utils/browser');

const ONE_YEAR_IN_S = 31536000;

describe('should renew token', async () => {

  beforeEach(async () => {
    await loginPage.cookieLogin();
  });

  it('Refresh page multiple times and verify token gets renewed', async () => {
    await commonPage.waitForPageLoaded();

    for (let counter = 0; counter < 3; counter++) {
      const beforePageLoadTime = moment().add(ONE_YEAR_IN_S, 'seconds');
      await browser.refresh();
      await commonPage.waitForPageLoaded();
      const afterPageLoadTime = moment().add(ONE_YEAR_IN_S, 'seconds');
      const ctxExpiry = await getCtxCookieExpiry();
      console.log(ctxExpiry);

      expect(
        ctxExpiry.isBetween(beforePageLoadTime, afterPageLoadTime),
        `Failed for counter = ${counter}, ${ctxExpiry} ${beforePageLoadTime} ${afterPageLoadTime}`
      ).to.be.true;
    }
  });
});

const getCtxCookieExpiry = async () => {
  const userCtxCookie = await browserPage.getCookies('userCtx');
  const momentObj = moment(userCtxCookie[0].expires * 1000);
  if (!momentObj.isValid()) {
    throw new Error(`Unable to construct moment object from cookie expiration: ${userCtxCookie}`);
  }
  return momentObj;
};
