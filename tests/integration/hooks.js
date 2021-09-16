const utils = require('../utils');
const request = require('request-promise-native');

exports.mochaHooks = {
  beforeAll: async ()=> {
    console.log('Starting services......');
    await utils.prepServices(true);
    console.log('Services started');
  },

  afterAll:async () => {
    await request.post('http://localhost:31337/die');
    console.log('Test done. Signing off ...');
  }
};
