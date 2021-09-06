const utils = require('../utils');
const auth = require('../auth')();
const request = require('request-promise-native');
const login = async (username = auth.username, password = auth.password) => {
  const opts = {
    path: '/medic/login',
    body: { user: username, password: password },
    method: 'POST',
    simple: false,
  };
  await utils.request(opts);
};

exports.mochaHooks = {
  beforeAll: async ()=> {
    console.log('Starting services......');
    await utils.prepServices({suite:'web'});
    console.log('Services started');
    // await login();
    // await utils.setupUserDoc();
  },

  afterAll:async () => {
    await request.post('http://localhost:31337/die');
    console.log('Test done. Signing off ...');
  }
};
