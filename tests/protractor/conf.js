var auth = require('./auth');

exports.config = {
  seleniumAddress: 'http://localhost:4444/wd/hub',
  specs: ['e2e/auditing.js'],
  capabilities: {
    // browserName: 'chromium-browser'
    browserName: 'firefox'
  },
  // TODO delete user at the end
  onPrepare: auth.setup
};