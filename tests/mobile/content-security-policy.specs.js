/*const utils = require('../utils');
const { expect } = require('chai');

describe('Content Security Policy', () => {
  beforeEach(() => utils.resetBrowser());

  // If this test fails, you've probably changed the inline telemetry script
  // If the change is intentional, take the hash recommended in this error and replace the telemetry hash in the
  // API helmet configuration
  it('Telemetry script is not blocked by CSP', () => {
    return browser.manage()
      .logs()
      .get('browser')
      .then((logEntries) => {
        logEntries.forEach(entry => {
          expect(entry.message).to.not.include('Refused to execute inline script');
        });
      });
  });
});*/
