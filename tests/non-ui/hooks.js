const config = require('./config');

exports.mochaHooks = {
  beforeAll: async ()=> {
    await config.prepServices();
  },

  afterAll(done) {
    config.stopServices();
    done();
  }
};
