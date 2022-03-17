const commonElements = require('../../page-objects/common/common.wdio.page.js');
const utils = require('../../utils');

describe('Offline first', () => {

  beforeAll(async () => {
    await commonElements.goToMessagesNative();
  });

  it('should be able to load with throttled connection', async () => {
    await browser.throttle({ latency: 60000 }); // take a minute to respond to any request
    await utils.resetBrowser();
  });

});
