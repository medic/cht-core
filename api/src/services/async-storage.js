const { AsyncLocalStorage } = require('node:async_hooks');
const asyncLocalStorage = new AsyncLocalStorage();
const { REQUEST_ID_HEADER } = require('../server-utils');

const request = require('@medic/couch-request');

module.exports = {
  set: (req, callback) => {
    asyncLocalStorage.run({ clientRequest: req }, callback);
  },
  getRequestId: () => {
    const localStorage = asyncLocalStorage.getStore();
    return localStorage?.clientRequest?.id;
  },
  getRequest: () => {
    const localStorage = asyncLocalStorage.getStore();
    return {
      user: localStorage?.clientRequest?.userCtx?.name,
      requestId: localStorage?.clientRequest?.id,
    };
  }
};

request.setStore(module.exports, REQUEST_ID_HEADER);
