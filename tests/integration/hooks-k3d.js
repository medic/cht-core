const utils = require('@utils');
const hooks = require('./hooks');

exports.mochaHooks = {
  ...hooks,
  beforeAll: async () => {
    console.log('Starting services......');
    await utils.prepK3DServices(true);
    console.log('Services started');
  },
};
