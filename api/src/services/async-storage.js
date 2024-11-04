const { AsyncLocalStorage } = require('node:async_hooks');
const asyncLocalStorage = new AsyncLocalStorage();
const { REQUEST_ID_HEADER } = require('../server-utils');

const request = require('@medic/couch-request');
request.initialize(asyncLocalStorage, REQUEST_ID_HEADER);

module.exports = asyncLocalStorage;
