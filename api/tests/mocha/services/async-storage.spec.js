const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');
const request = require('@medic/couch-request');
const serverUtils = require('../../../src/server-utils');

describe('async-storage', () => {
  let service;

  beforeEach(() => {
    sinon.stub(request, 'setStore');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should initialize async storage and initialize couch-request',  () => {
    service = rewire('../../../src/services/async-storage');
    expect(request.setStore.args).to.deep.equal([[
      service,
      serverUtils.REQUEST_ID_HEADER
    ]]);
  });

  it('set should set request uuid', () => {
    service = rewire('../../../src/services/async-storage');
    const asyncLocalStorage = service.__get__('asyncLocalStorage');
    sinon.stub(asyncLocalStorage, 'run');

    const req = { this: 'is a req' };
    const cb = sinon.stub();
    Object.freeze(req);
    service.set(req, cb);
    expect(asyncLocalStorage.run.args).to.deep.equal([[
      { clientRequest: req },
      cb
    ]]);
  });

  it('getRequestId should return request id when set', done => {
    service = rewire('../../../src/services/async-storage');
    const req = { id: 'uuid' };
    service.set(req, () => {
      expect(service.getRequestId()).to.equal('uuid');
      done();
    });
  });

  it('getRequestId should return nothing when there is no local storage', () => {
    service = rewire('../../../src/services/async-storage');
    expect(service.getRequestId()).to.equal(undefined);
  });

  it('getRequestId should return nothing when there is no client request', done => {
    service = rewire('../../../src/services/async-storage');
    service.set(undefined, () => {
      expect(service.getRequestId()).to.equal(undefined);
      done();
    });
  });
});
