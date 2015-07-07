exports.config = {
  seleniumAddress: 'http://localhost:4444/wd/hub',
  specs: ['e2e/auditing.js'],
  framework: 'jasmine2',
  capabilities: {
    // browserName: 'chromium-browser'
    browserName: 'firefox',
    loggingPrefs: { browser: 'INFO' }
  }
};