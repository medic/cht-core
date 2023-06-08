const fs = require('fs');

const logEntries = [];

const saveBrowserLogs = async (logLevels, browserLogPath) => {
  try {
    await browser.url('/');
    await browser.cdp('Log', 'enable');
    await browser.cdp('Runtime', 'enable');
    const writeToFile = browserLogPath === undefined ? false : true;
    // dedupe the messages to work around to known issue: https://github.com/webdriverio/webdriverio/issues/6347
    let lastMessage = '';
    browser.on('Runtime.consoleAPICalled', (data) => {
      if (data && logLevels.indexOf(data.type) >= 0) {
        const logEntry = `[${data.type}] Console Api Event: ${JSON.stringify(data.args)}\n`;
        if (logEntry !== lastMessage) {
          if (writeToFile) {
            fs.appendFileSync(browserLogPath, logEntry);
          } else {
            logEntries.push(logEntry);
          }
          lastMessage = logEntry;
        }
      }
    });
    browser.on('Log.entryAdded', (params) => {
      if (params && params.entry) {
        const entry = params.entry;
        const logEntry = `[${entry.level}]: ${entry.source} ${entry.text} url: ${entry.url} at ${entry.timestamp}\n`;
        if (logEntry !== lastMessage) {
          if (writeToFile) {
            fs.appendFileSync(browserLogPath, logEntry);
          } else {
            logEntries.push(logEntry);
          }
        }
      }
    });
  } catch (e) {
    console.error(e);
  }
};

const getLogEntries = () => {
  return logEntries;
};

module.exports = {
  saveBrowserLogs,
  getLogEntries,
};
