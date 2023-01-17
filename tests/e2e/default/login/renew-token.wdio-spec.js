
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const moment = require('moment');
const browserPage = require('../../../utils/browser');
const chai = require('chai');

describe('should renew token', async () => {

  beforeEach(async () => {
    await loginPage.cookieLogin();
  });

  it('Refresh page multiple times and verify token gets renewed', async () => {
    await commonPage.waitForPageLoaded();

    for (let counter = 0; counter < 3; counter++) {
      const beforePageLoadTime = moment();
      await browser.refresh();
      await commonPage.waitForPageLoaded();
      const afterPageLoadTime = moment();
      const ctxExpiry = await getCtxCookieExpiry();

      chai.expect(
        ctxExpiry.isBetween(beforePageLoadTime.add(1, 'year'), afterPageLoadTime.add(1, 'year')),
        `Failed for counter = ${counter}, ${ctxExpiry.toISOString()} ${beforePageLoadTime.toISOString()}`
      ).to.be.true;
    }
  });
});

const getCtxCookieExpiry = async () => {
  const userCtxCookie = await browserPage.getCookies('userCtx');
  const momentObj = moment.unix(userCtxCookie[0].expires);
  if (!momentObj.isValid()) {
    throw new Error(`Unable to construct moment object from cookie expiration: ${userCtxCookie}`);
  }
  return momentObj;
};
