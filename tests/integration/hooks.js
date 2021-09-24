const utils = require('../utils');
const request = require('request-promise-native');
const fs = require('fs');
const path = require('path');

const saveServiceWorkerContents = async () => {
  const serviceWorker = await utils.request({ path: '/service-worker.js', json: false });
  const buildSwPath = path.join(__dirname, '..', '..', 'build', 'service-worker.js');
  fs.writeFileSync(buildSwPath, serviceWorker);
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
