const { AsyncLocalStorage } = require('node:async_hooks');
const asyncLocalStorage = new AsyncLocalStorage();
const { REQUEST_ID_HEADER, PROXY_AUTH_HEADERS } = require('../server-utils');

const request = require('@medic/couch-request');

module.exports = {
  set: (req, callback) => {
    asyncLocalStorage.run({ clientRequest: req }, callback);
  },
  getRequestId: () => {
    const localStorage = asyncLocalStorage.getStore();
    return localStorage?.clientRequest?.id;
  },
};

// Maybe we need to init this someplace more logical
request.initialize(module.exports, REQUEST_ID_HEADER, PROXY_AUTH_HEADERS);
