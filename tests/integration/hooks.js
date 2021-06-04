const utils = require('../utils');
//Hooks not running atm. Probably a bug in grunt-mocha-test
exports.mochaHooks = {
  beforeAll: async ()=> {
    console.log('resetting the database...');
    await utils.prepServices();
    console.log('Test started...');
  },

  afterAll:async () => {
    console.log('Test done. Logging out...');
    await utils.stopServices();
  }
};

(async () => {
  await utils.prepServices();
})();
