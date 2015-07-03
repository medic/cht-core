exports.config = {
  seleniumAddress: 'http://127.0.0.2:4444/wd/hub',
  specs: ['e2e/auditing.js'],
  capabilities: {
    // browserName: 'chromium-browser'
    browserName: 'firefox'
  }
};