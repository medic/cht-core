exports.config = {
  seleniumAddress: 'http://localhost:4444/wd/hub',
  specs: ['e2e/auditing.js'],
  framework: 'jasmine2',
  baseUrl: 'http://ci_test:pass@localhost:5988/medic/_design/medic/_rewrite',
  capabilities: {
    // browserName: 'chromium-browser'
    browserName: 'firefox',
    loggingPrefs: { browser: 'INFO' }
  }
};