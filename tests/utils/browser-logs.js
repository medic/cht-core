const fs = require('fs');

const logEntries = [];



const saveBrowserLogs = async (logLevels, browserLogPath) => {
  try {
    await browser.url('/');

    const puppeteer = await browser.getPuppeteer();
    const target = await puppeteer.waitForTarget(t => t.url().includes('/'));
    const session = await target.createCDPSession();

    await session.send('Log.enable');
    await session.send('Runtime.enable');
    const writeToFile = browserLogPath !== undefined;
    browser.on('Runtime.consoleAPICalled', (data) => {
      if (data && logLevels.indexOf(data.type) >= 0) {
        const logEntry = `[${data.type}] Console Api Event: ${JSON.stringify(data.args)}\n`;
        if (writeToFile) {
          fs.appendFileSync(browserLogPath, logEntry);
        } else {
          logEntries.push(logEntry);
        }
      }
    });
    browser.on('Log.entryAdded', (params) => {
      if (params && params.entry) {
        const entry = params.entry;
        const logEntry = `[${entry.level}]: ${entry.source} ${entry.text} url: ${entry.url} at ${entry.timestamp}\n`;
        if (writeToFile) {
          fs.appendFileSync(browserLogPath, logEntry);
        } else {
          logEntries.push(logEntry);
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
