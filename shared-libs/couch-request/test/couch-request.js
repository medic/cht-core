
const chai = require('chai').use(require('chai-as-promised'));
const request = require('request-promise-native');
const sinon = require('sinon');
const rewire = require('rewire');

class Unicorn { }
const notPlainObjects = [[1, 2, 3], new Unicorn(), new Map([[1, 1], [2, 2], [3, 3]]), new Set([1, 2, 3]),
  () => { }, true, null, 1, NaN, Infinity, /foo/, new Date(), new Error(), new Int8Array(), new Float32Array(),
  new Float64Array(), new Uint8Array(), new Uint8ClampedArray(), new Uint16Array(), new Uint32Array(),
  new ArrayBuffer(), new WeakMap(), new WeakSet()];
const notPlainObjectsWithString = notPlainObjects.concat(['foo']);
const optionsErrorMsg = '"options" must be a plain object';

describe('Couch request rejects non-plain objects', () => {

  let couch_request;

  before(() => {
    sinon.stub(process, 'env').value({
      ...process.env,
      COUCH_URL: 'http://admin:password@test.com:5984/medic',
      ADD_SERVERNAME_TO_HTTP_AGENT: 'true' 
    });
    couch_request = rewire('../src/couch-request');
  });

  notPlainObjectsWithString.forEach(notPlainObject => {
    if (typeof notPlainObject === 'undefined' || notPlainObject === null) {
      it(`Rejects notPlainObject as second arg (method: get): (string, notPlainObject == null)`, done => {
        chai.expect(couch_request.get('string', notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
      it(`Rejects notPlainObject as second arg (method: post): (notPlainObject == null)`, done => {
        chai.expect(couch_request.post('string', notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
      it(`Rejects notPlainObject as second arg (method: put): (notPlainObject == null)`, done => {
        chai.expect(couch_request.put('string', notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
      it(`Rejects notPlainObject as second arg (method: delete): (notPlainObject == null)`, done => {
        chai.expect(couch_request.delete('string', notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
      it(`Rejects notPlainObject as second arg (method: head): (notPlainObject == null)`, done => {
        chai.expect(couch_request.head('string', notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
    } else {
      const toString = `${notPlainObject.toString()}`;
      const result = toString === '' ? Object.getPrototypeOf(notPlainObject).constructor.name : toString;
      it(`Rejects notPlainObject as second arg (method: get): (string, ${result})`, done => {
        chai.expect(couch_request.get('string', notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
      it(`Rejects notPlainObject as second arg (method: post): ${result}`, done => {
        chai.expect(couch_request.post('string', notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
      it(`Rejects notPlainObject as second arg (method: put): ${result}`, done => {
        chai.expect(couch_request.put('string', notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
      it(`Rejects notPlainObject as second arg (method: delete): ${result}`, done => {
        chai.expect(couch_request.delete('string', notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
      it(`Rejects notPlainObject as second arg (method: head): ${result}`, done => {
        chai.expect(couch_request.head('string', notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
    }
  });
  
  notPlainObjects.forEach(notPlainObject => {
    if (typeof notPlainObject === 'undefined' || notPlainObject === null) {
      it(`Rejects notPlainObject as first arg (method: get): (notPlainObject == null)`, done => {
        chai.expect(couch_request.get(notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
      it(`Rejects notPlainObject as first arg (method: post): (notPlainObject == null)`, done => {
        chai.expect(couch_request.post(notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
      it(`Rejects notPlainObject as first arg (method: put): (notPlainObject == null)`, done => {
        chai.expect(couch_request.put(notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
      it(`Rejects notPlainObject as first arg (method: delete): (notPlainObject == null)`, done => {
        chai.expect(couch_request.delete(notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
      it(`Rejects notPlainObject as first arg (method: head): (notPlainObject == null)`, done => {
        chai.expect(couch_request.head(notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
    } else {
      const toString = `${notPlainObject.toString()}`;
      const result = toString === '' ? Object.getPrototypeOf(notPlainObject).constructor.name : toString;
      it(`Rejects notPlainObject as first arg (method: get): (${result})`, done => {
        chai.expect(couch_request.get(notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
      it(`Rejects notPlainObject as first arg (method: post): ${result}`, done => {
        chai.expect(couch_request.post(notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
      it(`Rejects notPlainObject as first arg (method: put): ${result}`, done => {
        chai.expect(couch_request.put(notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
      it(`Rejects notPlainObject as first arg (method: delete): ${result}`, done => {
        chai.expect(couch_request.delete(notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
      it(`Rejects notPlainObject as first arg (method: head): ${result}`, done => {
        chai.expect(couch_request.head(notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
    }
  });
});

describe('Couch request with servername added receives correct options and returns stub value', () => {

  let couch_request;

  before(() => {
    sinon.stub(process, 'env').value({
      ...process.env,
      COUCH_URL: 'http://admin:password@test.com:5984/medic',
      ADD_SERVERNAME_TO_HTTP_AGENT: 'true' 
    });
    couch_request = rewire('../src/couch-request');
  });

  afterEach(() => {
    sinon.restore();
  });

  const options = [{ 
    foo: 'bar', url: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
    uri: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
    method: 'GET' // Should not be passed to options
  }];

  options.forEach(option => {
    
    it(`Get: Called with composite options and returns 'get'`, async function () {
      const requestGet = sinon.stub(request, 'get');
      requestGet.returns(Promise.resolve('get'));
      const result = await couch_request.get(option);
      sinon.assert.calledWith(requestGet, { 
        servername: 'test.com', foo: 'bar',
        url: 'shouldBeOverriddenWhenFirstParamIsAStringOnly', uri: 'shouldBeOverriddenWhenFirstParamIsAStringOnly' });
      chai.expect(result).to.equal('get');
    });
    it(`Get: Called with url as first parameter and composite options and returns 'get'`, async function () {
      const requestGet = sinon.stub(request, 'get');
      requestGet.returns(Promise.resolve('get'));
      const result = await couch_request.get('a-test-url', option);
      sinon.assert.calledWith(requestGet, 'a-test-url', { servername: 'test.com', foo: 'bar'});
      chai.expect(result).to.equal('get');
    });
    it(`Post: Called with composite options and returns 'post'`, async function () {
      const requestPost = sinon.stub(request, 'post');
      requestPost.returns(Promise.resolve('post'));
      const result = await couch_request.post(option);
      sinon.assert.calledWith(requestPost, {
        servername: 'test.com', foo: 'bar',
        url: 'shouldBeOverriddenWhenFirstParamIsAStringOnly', uri: 'shouldBeOverriddenWhenFirstParamIsAStringOnly' });
      chai.expect(result).to.equal('post');
    });
    it(`Post: Called with url as first parameter and composite options and returns 'post'`, async function () {
      const requestPost = sinon.stub(request, 'post');
      requestPost.returns(Promise.resolve('post'));
      const result = await couch_request.post('a-test-url', option);
      sinon.assert.calledWith(requestPost, 'a-test-url', {
        servername: 'test.com', foo: 'bar' });
      chai.expect(result).to.equal('post');
    });
    it(`Head: Called with composite options and returns 'head'`, async function () {
      const requestHead = sinon.stub(request, 'head');
      requestHead.returns(Promise.resolve('head'));
      const result = await couch_request.head(option);
      sinon.assert.calledWith(requestHead, {
        servername: 'test.com', foo: 'bar',
        url: 'shouldBeOverriddenWhenFirstParamIsAStringOnly', uri: 'shouldBeOverriddenWhenFirstParamIsAStringOnly' });
      chai.expect(result).to.equal('head');
    });
    it(`Head: Called with url as first parameter and composite options and returns 'head'`, async function () {
      const requestHead = sinon.stub(request, 'head');
      requestHead.returns(Promise.resolve('head'));
      const result = await couch_request.head('a-test-url', option);
      sinon.assert.calledWith(requestHead, 'a-test-url',  {
        servername: 'test.com', foo: 'bar' });
      chai.expect(result).to.equal('head');
    });
    it(`Delete: Called with composite options and returns 'delete'`, async function () {
      const requestDelete = sinon.stub(request, 'delete');
      requestDelete.returns(Promise.resolve('delete'));
      const result = await couch_request.delete(option);
      sinon.assert.calledWith(requestDelete, {
        servername: 'test.com', foo: 'bar', 
        url: 'shouldBeOverriddenWhenFirstParamIsAStringOnly', uri: 'shouldBeOverriddenWhenFirstParamIsAStringOnly' });
      chai.expect(result).to.equal('delete');
    });
    it(`Delete: Called with url as first parameter and composite options and returns 'delete'`, async function () {
      const requestDelete = sinon.stub(request, 'delete');
      requestDelete.returns(Promise.resolve('delete'));
      const result = await couch_request.delete('a-test-url', option);
      sinon.assert.calledWith(requestDelete, 'a-test-url', {
        servername: 'test.com', foo: 'bar' });
      chai.expect(result).to.equal('delete');
    });
    it(`Put: Called with composite options and returns 'put'`, async function () {
      const requestPut = sinon.stub(request, 'put');
      requestPut.returns(Promise.resolve('put'));
      const result = await couch_request.put(option);
      sinon.assert.calledWith(requestPut, {
        servername: 'test.com', foo: 'bar',
        url: 'shouldBeOverriddenWhenFirstParamIsAStringOnly', uri: 'shouldBeOverriddenWhenFirstParamIsAStringOnly' });
      chai.expect(result).to.equal('put');
    });
    it(`Put: Called with url as first parameter and composite options and returns 'put'`, async function () {
      const requestPut = sinon.stub(request, 'put');
      requestPut.returns(Promise.resolve('put'));
      const result = await couch_request.put('a-test-url', option);
      sinon.assert.calledWith(requestPut, 'a-test-url', {
        servername: 'test.com', foo: 'bar' });
      chai.expect(result).to.equal('put');
    });
  });

  const overrideOptions = [{ foo: 'bar', servername: 'bar' }];
  
  overrideOptions.forEach(option => {

    it(`Get: Called with options overridden and returns 'get'`, async function () {
      const requestGet = sinon.stub(request, 'get');
      requestGet.returns(Promise.resolve('get'));
      const result = await couch_request.get(option);
      sinon.assert.calledWith(requestGet, { servername: 'bar', foo: 'bar' });
      chai.expect(result).to.equal('get');
    });
    it(`Get: Called with url in first param and options overridden and returns 'get'`, async function () {
      const requestGet = sinon.stub(request, 'get');
      requestGet.returns(Promise.resolve('get'));
      const result = await couch_request.get('a-test-url', option);
      sinon.assert.calledWith(requestGet, 'a-test-url', { servername: 'bar', foo: 'bar' });
      chai.expect(result).to.equal('get');
    });
    it(`Post: Called with options overridden and returns 'post'`, async function () {
      const requestPost = sinon.stub(request, 'post');
      requestPost.returns(Promise.resolve('post'));
      const result = await couch_request.post(option);
      sinon.assert.calledWith(requestPost, { servername: 'bar', foo: 'bar' });
      chai.expect(result).to.equal('post');
    });
    it(`Post: Called with url in first param and options overridden and returns 'post'`, async function () {
      const requestPost = sinon.stub(request, 'post');
      requestPost.returns(Promise.resolve('post'));
      const result = await couch_request.post('a-test-url', option);
      sinon.assert.calledWith(requestPost, 'a-test-url', { servername: 'bar', foo: 'bar' });
      chai.expect(result).to.equal('post');
    });
    it(`Head: Called with options overridden and returns 'head'`, async function () {
      const requestHead = sinon.stub(request, 'head');
      requestHead.returns(Promise.resolve('head'));
      const result = await couch_request.head(option);
      sinon.assert.calledWith(requestHead, { servername: 'bar', foo: 'bar' });
      chai.expect(result).to.equal('head');
    });
    it(`Head: Called with url in first param and options overridden and returns 'head'`, async function () {
      const requestHead = sinon.stub(request, 'head');
      requestHead.returns(Promise.resolve('head'));
      const result = await couch_request.head('a-test-url', option);
      sinon.assert.calledWith(requestHead, 'a-test-url', { servername: 'bar', foo: 'bar' });
      chai.expect(result).to.equal('head');
    });
    it(`Delete: Called with options overridden and returns 'delete'`, async function () {
      const requestDelete = sinon.stub(request, 'delete');
      requestDelete.returns(Promise.resolve('delete'));
      const result = await couch_request.delete(option);
      sinon.assert.calledWith(requestDelete, { servername: 'bar', foo: 'bar' });
      chai.expect(result).to.equal('delete');
    });
    it(`Delete: Called with url in first param and options overridden and returns 'delete'`, async function () {
      const requestDelete = sinon.stub(request, 'delete');
      requestDelete.returns(Promise.resolve('delete'));
      const result = await couch_request.delete('a-test-url', option);
      sinon.assert.calledWith(requestDelete, 'a-test-url', { servername: 'bar', foo: 'bar' });
      chai.expect(result).to.equal('delete');
    });
    it(`Put: Called with options overridden and returns 'put'`, async function () {
      const requestPut = sinon.stub(request, 'put');
      requestPut.returns(Promise.resolve('put'));
      const result = await couch_request.put(option);
      sinon.assert.calledWith(requestPut, { servername: 'bar', foo: 'bar' });
      chai.expect(result).to.equal('put');
    });
    it(`Put: Called with url in first param and options overridden and returns 'put'`, async function () {
      const requestPut = sinon.stub(request, 'put');
      requestPut.returns(Promise.resolve('put'));
      const result = await couch_request.put('a-test-url', option);
      sinon.assert.calledWith(requestPut, 'a-test-url', { servername: 'bar', foo: 'bar' });
      chai.expect(result).to.equal('put');
    });
  });
});

describe('Couch request with default servername omitted receives correct options and returns stub value', () => {

  let couch_request;

  before(() => {
    sinon.stub(process, 'env').value({
      ...process.env,
      COUCH_URL: 'http://admin:password@test.com:5984/medic',
      ADD_SERVERNAME_TO_HTTP_AGENT: 'false' 
    });
    couch_request = rewire('../src/couch-request');
  });

  afterEach(() => {
    sinon.restore();
  });

  const options = [{ 
    foo: 'bar', url: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
    uri: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
    method: 'GET' // Should not be passed to options
  }];

  options.forEach(option => {
    
    it(`Get: Called with composite options and returns 'get'`, async function () {
      const requestGet = sinon.stub(request, 'get');
      requestGet.returns(Promise.resolve('get'));
      const result = await couch_request.get(option);
      sinon.assert.calledWith(requestGet, { 
        foo: 'bar',
        url: 'shouldBeOverriddenWhenFirstParamIsAStringOnly', uri: 'shouldBeOverriddenWhenFirstParamIsAStringOnly' });
      chai.expect(result).to.equal('get');
    });
    it(`Post: Called with composite options and returns 'post'`, async function () {
      const requestPost = sinon.stub(request, 'post');
      requestPost.returns(Promise.resolve('post'));
      const result = await couch_request.post(option);
      sinon.assert.calledWith(requestPost, {
        foo: 'bar',
        url: 'shouldBeOverriddenWhenFirstParamIsAStringOnly', uri: 'shouldBeOverriddenWhenFirstParamIsAStringOnly' });
      chai.expect(result).to.equal('post');
    });
    it(`Head: Called with url as first parameter and composite options and returns 'head'`, async function () {
      const requestHead = sinon.stub(request, 'head');
      requestHead.returns(Promise.resolve('head'));
      const result = await couch_request.head('a-test-url', option);
      sinon.assert.calledWith(requestHead, 'a-test-url',  {
        foo: 'bar' });
      chai.expect(result).to.equal('head');
    });
    it(`Delete: Called with url as first parameter and composite options and returns 'delete'`, async function () {
      const requestDelete = sinon.stub(request, 'delete');
      requestDelete.returns(Promise.resolve('delete'));
      const result = await couch_request.delete('a-test-url', option);
      sinon.assert.calledWith(requestDelete, 'a-test-url', {
        foo: 'bar' });
      chai.expect(result).to.equal('delete');
    });
    it(`Put: Called with composite options and returns 'put'`, async function () {
      const requestPut = sinon.stub(request, 'put');
      requestPut.returns(Promise.resolve('put'));
      const result = await couch_request.put(option);
      sinon.assert.calledWith(requestPut, {
        foo: 'bar',
        url: 'shouldBeOverriddenWhenFirstParamIsAStringOnly', uri: 'shouldBeOverriddenWhenFirstParamIsAStringOnly' });
      chai.expect(result).to.equal('put');
    });
  });

  const overrideOptions = [{ foo: 'bar', servername: 'bar' }];
  
  overrideOptions.forEach(option => {

    it(`Get: Called with url in first param and options overridden,
     servername allowed as optional override and returns 'get'`, async function () {
      const requestGet = sinon.stub(request, 'get');
      requestGet.returns(Promise.resolve('get'));
      const result = await couch_request.get('a-test-url', option);
      sinon.assert.calledWith(requestGet, 'a-test-url', { servername: 'bar', foo: 'bar' });
      chai.expect(result).to.equal('get');
    });
    it(`Post: Called with options overridden,
      servername allowed as optional override and returns 'post'`, async function () {
      const requestPost = sinon.stub(request, 'post');
      requestPost.returns(Promise.resolve('post'));
      const result = await couch_request.post(option);
      sinon.assert.calledWith(requestPost, { servername: 'bar', foo: 'bar' });
      chai.expect(result).to.equal('post');
    });
    it(`Head: Called with url in first param and options overridden,
     servername allowed as optional override and returns 'head'`, async function () {
      const requestHead = sinon.stub(request, 'head');
      requestHead.returns(Promise.resolve('head'));
      const result = await couch_request.head('a-test-url', option);
      sinon.assert.calledWith(requestHead, 'a-test-url', { servername: 'bar', foo: 'bar' });
      chai.expect(result).to.equal('head');
    });
    it(`Delete: Called with options overridden,
     servername allowed as optional override and returns 'delete'`, async function () {
      const requestDelete = sinon.stub(request, 'delete');
      requestDelete.returns(Promise.resolve('delete'));
      const result = await couch_request.delete(option);
      sinon.assert.calledWith(requestDelete, { servername: 'bar', foo: 'bar' });
      chai.expect(result).to.equal('delete');
    });
    it(`Put: Called with url in first param and options overridden,
     servername allowed as optional override and returns 'put'`, async function () {
      const requestPut = sinon.stub(request, 'put');
      requestPut.returns(Promise.resolve('put'));
      const result = await couch_request.put('a-test-url', option);
      sinon.assert.calledWith(requestPut, 'a-test-url', { servername: 'bar', foo: 'bar' });
      chai.expect(result).to.equal('put');
    });
  });
});
