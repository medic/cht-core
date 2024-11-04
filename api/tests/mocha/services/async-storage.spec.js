const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');
const asyncHooks = require('node:async_hooks');
const request = require('@medic/couch-request');
const serverUtils = require('../../../src/server-utils');

describe('async-storage', () => {
  let service;
  let asyncLocalStorage;

  beforeEach(() => {
    asyncLocalStorage = sinon.spy(asyncHooks, 'AsyncLocalStorage');
    sinon.stub(request, 'initialize');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should initialize async storage and initialize couch-request', async () => {
    service = rewire('../../../src/services/async-storage');

    expect(asyncLocalStorage.callCount).to.equal(1);
    expect(request.initialize.args).to.deep.equal([[service, serverUtils.REQUEST_ID_HEADER]]);
  });
});
