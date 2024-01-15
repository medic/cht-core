const browserLogUtils = require('@utils/browser-logs');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');

describe('Content Security Policy', () => {

  beforeEach(async () => {
    await loginPage.cookieLogin();
  });

  after(async () => {
    await commonPage.logout();
  });

  // If this test fails, you've probably changed the inline telemetry script
  // If the change is intentional, take the hash recommended in this error and replace the telemetry hash in the
  // API helmet configuration
  it('Telemetry script is not blocked by Content Security Policy', async () => {
    await browserLogUtils.saveBrowserLogs(['error', 'warning', 'debug']);
    await commonPage.waitForPageLoaded();
    const logEntries = browserLogUtils.getLogEntries();
    logEntries.forEach(entry => {
      expect(entry).to.not.include('Refused to execute inline script');
    });
  });
});
