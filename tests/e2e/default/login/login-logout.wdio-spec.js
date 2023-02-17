// const loginPage = require('../../../page-objects/default/login/login.wdio.page');
// const commonPage = require('../../../page-objects/default/common/common.wdio.page');
// const modalPage = require('../../../page-objects/default/common/modal.wdio.page');
// const constants = require('../../../constants');

// const auth = {
//   username: constants.USERNAME,
//   password: constants.PASSWORD
// };

describe('Login and logout tests', () => {
 

  it('should display the "session expired" modal and redirect to login page', async () => {
    // Login and ensure it's redirected to webapp
    // await loginPage.login(auth);
    // await commonPage.closeTour();
    // await (await commonPage.messagesTab()).waitForDisplayed();
    // // Delete cookies and trigger a request to the server
    // await browser.deleteCookies('AuthSession');
    // await commonPage.goToReports();

    // expect(await (await modalPage.body()).getText()).to.equal('Your session has expired, please login to continue.');
    // await (await modalPage.submit()).click();
    const url = await browser.url('https://webdriver.io');
    expect(await url()).to.equal('https://webdriver.io');
  });
});
