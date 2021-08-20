const utils = require('../utils');
const request = require('request-promise-native');

exports.mochaHooks = {
  beforeAll: async ()=> {
    console.log('Starting services......');
    await utils.prepServices();
    console.log('Services started');
  },

  afterAll:async () => {
    try {
      await request.post('http://localhost:31337/die');
    } catch (e) {
      console.error('an error occured');
      console.error(JSON.stringify(e));
    }

    console.log('Test done. Signing off ...');
  }
};
