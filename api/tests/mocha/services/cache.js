const sinon = require('sinon');
const chai = require('chai');
const rewire = require('rewire');

let service;
let nodeCache;
describe('Cache service', () => {
  beforeEach(() => {
    service = rewire('../../../src/services/cache');
    nodeCache = sinon.stub();
    service.__set__('NodeCache', nodeCache);
  });
  afterEach(() => sinon.restore());

  describe('instance', () => {
    it('should initialize a cache with provided name', () => {
      service.instance('some name');
      chai.expect(nodeCache.callCount).to.equal(1);
      chai.expect(nodeCache.args[0]).to.deep.equal([{
        stdTTL: 5 * 60,
        checkperiod: 5 * 60,
        useClones: false
      }]);

      service.instance('other name', { some: 'param', stdTTL: 10, useClones: true });
      chai.expect(nodeCache.callCount).to.equal(2);
      chai.expect(nodeCache.args[1]).to.deep.equal([{
        some: 'param',
        stdTTL: 10,
        checkperiod: 5 * 60,
        useClones: true
      }]);
      chai.expect(nodeCache.alwaysCalledWithNew()).to.equal(true);
    });

    it('should return previously initialized value if exists', () => {
      service.instance('cache name');
      chai.expect(nodeCache.callCount).to.equal(1);
      chai.expect(nodeCache.args[0]).to.deep.equal([{
        stdTTL: 5 * 60,
        checkperiod: 5 * 60,
        useClones: false
      }]);

      service.instance('cache name');
      chai.expect(nodeCache.callCount).to.equal(1);
      service.instance('cache name');
      chai.expect(nodeCache.callCount).to.equal(1);
    });
  });

  describe('clear', () => {
    it('should do nothing when key is not found', () => {
      const caches = new Map();
      const cache = { flushAll: sinon.stub() };
      caches.set('one', cache);
      service.__set__('caches', caches);
      service.clear('other');
      chai.expect(caches.has('one')).to.equal(true);
      chai.expect(cache.flushAll.callCount).to.equal(0);
    });

    it('should flushall and delete cache', () => {
      const caches = new Map();
      const cache1 = { flushAll: sinon.stub() };
      const cache2 = { flushAll: sinon.stub() };
      caches.set('one', cache1);
      caches.set('two', cache2);
      service.__set__('caches', caches);
      service.clear('two');
      chai.expect(caches.has('one')).to.equal(true);
      chai.expect(caches.has('two')).to.equal(false);
      chai.expect(cache1.flushAll.callCount).to.equal(0);
      chai.expect(cache2.flushAll.callCount).to.equal(1);
    });
  });
});
