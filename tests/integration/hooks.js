const utils = require('../utils');
const fs = require('fs');
const path = require('path');

const saveServiceWorkerContents = async () => {
  // this is silly
  // Because the service worker is generated at runtime, we need to have API booted to generate the file.
  // We also need to treat linting the service-worker as an E2E test, since results could differ based on node version.
  // To run on all supported node versions, we boot API via horticulturalist in a Docker container, API saves
  // extracted resources within the container, the actual service worker file is not accessible without Docker cli.
  // Local tests don't boot API in Docker, and the service worker file is saved in a different location.
  // I'm saving the output of the service-worker API request, and I run eslint over this file later.
  // Newer versions of eslint offer an API run linting directly from JS, but we're on an older version, with a
  // clunky API. I also wanted to avoid introducing more code that needs maintaining and updating.
  // A wise man once said that if you need more than 100 words to justify your code, you're doing something wrong.
  // go to 1
  const serviceWorker = await utils.request({ path: '/service-worker.js', json: false });
  const buildPath = path.join(__dirname, '..', '..', 'build');
  if (!fs.existsSync(buildPath)) {
    fs.mkdirSync(buildPath);
  }
  const swPath = path.join(buildPath, 'service-worker.js');
  fs.writeFileSync(swPath, serviceWorker);
};


exports.mochaHooks = {
  beforeAll: async () => {
    console.log('Starting services......');
    await utils.prepServices(true);
    console.log('Services started');
    await saveServiceWorkerContents();
  },

  afterAll: async () => {
    await utils.tearDownServices();
    console.log('Test done. Signing off ...');
  },

  beforeEach: function () {
    return utils.apiLogTestStart(this.currentTest.title);
  },
  afterEach: function () {
    return utils.apiLogTestEnd(this.currentTest.title);
  },
};
