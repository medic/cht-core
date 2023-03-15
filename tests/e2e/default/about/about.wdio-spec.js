const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const aboutPage = require('../../../page-objects/default/about/about.wdio.page');

describe('About page', async () => {
  before(async () => {
    await loginPage.cookieLogin();
  });
  // after(async () => {
  //   await browser.pause(120000000);
  // });
  it('should open the about page', async () => {
    await commonPage.goToAboutPage();
    await (await aboutPage.userName()).waitForDisplayed();
  });

});
