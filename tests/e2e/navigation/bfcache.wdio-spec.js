const commonPage = require('../../page-objects/common/common.wdio.page');
const loginPage = require('../../page-objects/login/login.wdio.page');

describe('bfcache', async () => {
  it('should redirect to login page when session is expired', async () => {
    await loginPage.cookieLogin();
    await commonPage.goToPeople();
    await browser.deleteCookies('AuthSession');
    await commonPage.goToMessages();
    const redirectToLoginBtn = await $('#session-expired .btn.submit.btn-primary');
    await redirectToLoginBtn.click();
    expect(await browser.getUrl()).to.contain('/medic/login?redirect=');
    await browser.back();
    expect(await browser.getUrl()).to.contain('/medic/login?redirect=');
  });
});
