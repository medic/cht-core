const utils = require('../utils');
const request = require('request-promise-native');
const fs = require('fs');
const path = require('path');

const saveServiceWorkerContents = async () => {
  // this is silly
  // Because the service worker is generated at runtime we need to have API running and responding to get the service
  // worker content. We also need to treat this as an E2E test, since results could differ based on node version,
  // so this should run against all suites.
  // To run on all supported node versions, we boot API via horticulturalist in a container, and API saves
  // extracted resources within the container, the actual service worker file is not easy to get without docker cli.
  // Local tests don't boot API in docker, and the file is saved in a completely different place.
  // So yes, I'm saving the output of the service-worker API request in a file, so I run eslint over it later.
  // Newer versions of eslint offer an API run run linting directly from JS, but we're on an older version, with a
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

  afterAll:async () => {
    await request.post('http://localhost:31337/die');
    console.log('Test done. Signing off ...');
  }
};
