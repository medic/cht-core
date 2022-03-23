const commonPage = require('../../page-objects/common/common.wdio.page');
const loginPage = require('../../page-objects/login/login.wdio.page');

describe('Offline first', () => {

  beforeEach(async () => {
    await loginPage.cookieLogin();
  });

  afterEach(async () => {
    await browser.throttle('online'); // remove throttling
  });

  it('should be able to load with throttled connection', async () => {
    const turtleMode = {
      offline: false,
      latency: 60000, // take a minute to respond to any request
      downloadThroughput: -1,
      uploadThroughput: -1
    };
    await browser.throttle(turtleMode);
    await browser.refresh();
    await commonPage.goToBase(); // assert page loads
  });

  it('should be able to load when offline', async () => {
    await browser.throttle('offline');
    await browser.refresh();
    await commonPage.goToBase(); // assert page loads
  });

});
