const couch_request = require('../src/couch-request');
const chai = require('chai').use(require('chai-as-promised'));
const request = require('request-promise-native');
const sinon = require('sinon');

class Unicorn { }
const notPlainObjects = [[1, 2, 3], new Unicorn(), new Map([[1, 1], [2, 2], [3, 3]]), new Set([1, 2, 3]),
  () => { }, true, 'foo', null, 1, NaN, Infinity, /foo/, new Date(), new Error(), new Int8Array(), new Float32Array(),
  new Float64Array(), new Uint8Array(), new Uint8ClampedArray(), new Uint16Array(), new Uint32Array(),
  new ArrayBuffer(), new WeakMap(), new WeakSet()];
const optionsErrorMsg = '"options" must be a plain object';

describe('Couch request rejects non-plain objects', () => {

  let requestGet;
  let requestPost;
  let requestPut;
  let requestDelete;
  let requestHead;

  beforeEach(() => {
    requestGet = sinon.stub(request, 'get');
    requestPost = sinon.stub(request, 'post');
    requestPut = sinon.stub(request, 'put');
    requestDelete = sinon.stub(request, 'delete');
    requestHead = sinon.stub(request, 'head');
    requestGet.returns(Promise.resolve('foo'));
    requestPost.returns(Promise.resolve('foo'));
    requestPut.returns(Promise.resolve('foo'));
    requestDelete.returns(Promise.resolve('foo'));
    requestHead.returns(Promise.resolve('foo'));
  });

  afterEach(() => {
    requestGet.restore();
    requestPost.restore();
    requestPut.restore();
    requestDelete.restore();
    requestHead.restore();
    sinon.restore();
  });

  notPlainObjects.forEach(notPlainObject => {
    if (notPlainObject == null) {
      it(`Rejects (method: get): (notPlainObject == null)`, done => {
        chai.expect(couch_request.get(notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
      it(`Rejects (method: post): (notPlainObject == null)`, done => {
        chai.expect(couch_request.post(notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
      it(`Rejects (method: put): (notPlainObject == null)`, done => {
        chai.expect(couch_request.put(notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
      it(`Rejects (method: delete): (notPlainObject == null)`, done => {
        chai.expect(couch_request.delete(notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
      it(`Rejects (method: head): (notPlainObject == null)`, done => {
        chai.expect(couch_request.head(notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
    } else {
      const toString = `${notPlainObject.toString()}`;
      const result = toString === '' ? Object.getPrototypeOf(notPlainObject).constructor.name : toString;
      it(`Rejects notPlainObject (method: get): ${result}`, done => {
        chai.expect(couch_request.get(notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
      it(`Rejects notPlainObject (method: post): ${result}`, done => {
        chai.expect(couch_request.post(notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
      it(`Rejects notPlainObject (method: put): ${result}`, done => {
        chai.expect(couch_request.put(notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
      it(`Rejects notPlainObject (method: delete): ${result}`, done => {
        chai.expect(couch_request.delete(notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
      it(`Rejects notPlainObject (method: head): ${result}`, done => {
        chai.expect(couch_request.head(notPlainObject)).to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error).notify(done);
      });
    }
  });
});

describe('Couch request receives correct options and returns stub value', () => {

  let requestGet;
  let requestPost;
  let requestPut;
  let requestDelete;
  let requestHead;

  beforeEach(() => {
    sinon.stub(process, 'env').value({ ...process.env, COUCH_URL: 'http://admin:password@test.com:5984/medic' });
    requestGet = sinon.stub(request, 'get');
    requestPost = sinon.stub(request, 'post');
    requestPut = sinon.stub(request, 'put');
    requestDelete = sinon.stub(request, 'delete');
    requestHead = sinon.stub(request, 'head');
    requestGet.returns(Promise.resolve('foo'));
    requestPost.returns(Promise.resolve('foo'));
    requestPut.returns(Promise.resolve('foo'));
    requestDelete.returns(Promise.resolve('foo'));
    requestHead.returns(Promise.resolve('foo'));
  });

  afterEach(() => {
    requestGet.restore();
    requestPost.restore();
    requestPut.restore();
    requestDelete.restore();
    requestHead.restore();
    sinon.restore();
  });

  const options = [{ foo: 'bar' }];


  options.forEach(option => {
    it(`Get: Called with composite options and returns 'foo'`, async function () {
      const result = await couch_request.get(option);
      sinon.assert.calledWith(requestGet, { servername: 'test.com', foo: 'bar' });
      chai.expect(result).to.equal('foo');
    });
    it(`Post: Called with composite options and returns 'foo'`, async function () {
      const result = await couch_request.post(option);
      sinon.assert.calledWith(requestPost, { servername: 'test.com', foo: 'bar' });
      chai.expect(result).to.equal('foo');
    });
    it(`Head: Called with composite options and returns 'foo'`, async function () {
      const result = await couch_request.head(option);
      sinon.assert.calledWith(requestHead, { servername: 'test.com', foo: 'bar' });
      chai.expect(result).to.equal('foo');
    });
    it(`Delete: Called with composite options and returns 'foo'`, async function () {
      const result = await couch_request.delete(option);
      sinon.assert.calledWith(requestDelete, { servername: 'test.com', foo: 'bar' });
      chai.expect(result).to.equal('foo');
    });
    it(`Put: Called with composite options and returns 'foo'`, async function () {
      const result = await couch_request.put(option);
      sinon.assert.calledWith(requestPut, { servername: 'test.com', foo: 'bar' });
      chai.expect(result).to.equal('foo');
    });

  });

  const overrideOptions = [{ foo: 'bar', servername: 'bar' }];
  
  overrideOptions.forEach(option => {

    it(`Get: Called with options overridden and returns 'foo'`, async function () {
      const result = await couch_request.get(option);
      sinon.assert.calledWith(requestGet, { servername: 'bar', foo: 'bar' });
      chai.expect(result).to.equal('foo');
    });
    it(`Post: Called with options overridden and returns 'foo'`, async function () {
      const result = await couch_request.post(option);
      sinon.assert.calledWith(requestPost, { servername: 'bar', foo: 'bar' });
      chai.expect(result).to.equal('foo');
    });
    it(`Head: Called with options overridden and returns 'foo'`, async function () {
      const result = await couch_request.head(option);
      sinon.assert.calledWith(requestHead, { servername: 'bar', foo: 'bar' });
      chai.expect(result).to.equal('foo');
    });
    it(`Delete: Called with options overridden and returns 'foo'`, async function () {
      const result = await couch_request.delete(option);
      sinon.assert.calledWith(requestDelete, { servername: 'bar', foo: 'bar' });
      chai.expect(result).to.equal('foo');
    });
    it(`Put: Called with options overridden and returns 'foo'`, async function () {
      const result = await couch_request.put(option);
      sinon.assert.calledWith(requestPut, { servername: 'bar', foo: 'bar' });
      chai.expect(result).to.equal('foo');
    });
  });
});

