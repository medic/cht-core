const environment = require('./utils/environment');
const request = require('request-promise-native');

exports.mochaHooks = {
  beforeAll: async ()=> {
    console.log('Starting services......');
    await environment.prepServices();
    console.log('Services started');
  },

  afterAll:async () => {
    await request.post('http://localhost:31337/die');
    console.log('Test done. Signing off ...');
  }
};
