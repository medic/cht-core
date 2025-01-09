const { AsyncLocalStorage } = require('node:async_hooks');
const asyncLocalStorage = new AsyncLocalStorage();

module.exports = {
  set: (req, callback) => {
    asyncLocalStorage.run({ clientRequest: req }, callback);
  },
  getRequestId: () => {
    const localStorage = asyncLocalStorage.getStore();
    return localStorage?.clientRequest?.id;
  },
};
