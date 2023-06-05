const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');

describe('Content Security Policy', () => {
  const logEntries = [];
  const getBrowserLogs = async (logLevels) => {
    try {
      await browser.url('/');
      await browser.cdp('Log', 'enable');
      await browser.cdp('Runtime', 'enable');
      let lastMessage = '';
      browser.on('Runtime.consoleAPICalled', (data) => {
        if (data && logLevels.indexOf(data.type) >= 0) {
          const logEntry = `[${data.type}] Console Api Event: ${JSON.stringify(data.args)}`;
          if (logEntry !== lastMessage) {
            logEntries.push(logEntry);
            lastMessage = logEntry;
          }
        }
      });
      browser.on('Log.entryAdded', (params) => {
        if (params && params.entry) {
          const entry = params.entry;
          const logEntry = `[${entry.level}]: ${entry.source} ${entry.text} url: ${entry.url} at ${entry.timestamp}`;
          if (logEntry !== lastMessage) {
            logEntries.push(logEntry);
            lastMessage = logEntry;
          }
        }
      });
    } catch (e) {
      console.error(e);
    }
  };

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
    await getBrowserLogs(['error', 'warning', 'debug']);
    await commonPage.waitForPageLoaded();
    logEntries.forEach(entry => {
      expect(entry).to.not.include('Refused to execute inline script');
    });
  });
});
