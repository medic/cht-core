const utils = require('../utils');

exports.mochaHooks = {
  beforeAll: async () => {
    console.log('Starting services......');
    await utils.prepK3DServices(true);
    console.log('Services started');
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
