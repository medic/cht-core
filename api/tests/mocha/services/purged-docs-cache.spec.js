const sinon = require('sinon');
const chai = require('chai').use(require('chai-as-promised'));
const expect = chai.expect;
const rewire = require('rewire');

const db = require('../../../src/db');
const environment = require('@medic/environment');

let purgedDocsCache;
let purgedDbObj;
let setTimeoutPromiseStub;

describe('Purged docs cache', () => {
  beforeEach(() => {
    purgedDbObj = {
      destroy: sinon.stub().returns(new Promise(r => setTimeout(r, 20))),
      get: sinon.stub(),
      remove: sinon.stub(),
      put: sinon.stub(),
    };
    sinon.stub(db, 'get').returns(purgedDbObj);
    sinon.stub(environment, 'db').value('medic');
    purgedDocsCache = rewire('../../../src/services/purged-docs-cache');
    setTimeoutPromiseStub = sinon.stub().resolves();
    purgedDocsCache.__set__('setTimeoutPromise', setTimeoutPromiseStub);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('wipe', () => {
    it('should do nothing if no purgedb is defined', async () => {
      await purgedDocsCache.wipe();

      expect(db.get.callCount).to.equal(0);
      expect(purgedDbObj.destroy.callCount).to.equal(0);
      expect(purgedDocsCache.__get__('destroyPromise')).to.equal(null);
    });

    it('should destroy the database', async () => {
      await purgedDocsCache.__get__('getCacheDatabase')();
      sinon.resetHistory();

      await purgedDocsCache.wipe();
      expect(db.get.callCount).to.equal(0);
      expect(purgedDbObj.destroy.callCount).to.equal(1);
      expect(purgedDocsCache.__get__('destroyPromise')).to.equal(null);
    });

    it('should not destroy multiple times', async () => {
      await purgedDocsCache.__get__('getCacheDatabase')();
      sinon.resetHistory();

      purgedDocsCache.wipe();
      purgedDocsCache.wipe();
      purgedDocsCache.wipe();
      purgedDocsCache.wipe();

      await purgedDocsCache.wipe();
      expect(db.get.callCount).to.equal(0);
      expect(purgedDbObj.destroy.callCount).to.equal(1);
      expect(purgedDocsCache.__get__('destroyPromise')).to.equal(null);
    });
  });

  describe('get', () => {
    it('should return cached ids if doc exists', async () => {
      purgedDbObj.get.resolves({ doc_ids: [1, 2, 3] });
      const result = await purgedDocsCache.get('the-username');
      expect(result).to.deep.equal([1, 2, 3]);
      expect(purgedDbObj.get.args).to.deep.equal([['purged-docs-the-username']]);
    });

    it('should return nothing for no username', async () => {
      expect(await purgedDocsCache.get()).to.equal(undefined);
    });

    it('should return nothing when cache does not exist', async () => {
      purgedDbObj.get.rejects({ status: 404 });
      const result = await purgedDocsCache.get('bob');
      expect(result).to.equal(undefined);
      expect(purgedDbObj.get.args).to.deep.equal([['purged-docs-bob']]);
    });

    it('should throw other get errors', async () => {
      purgedDbObj.get.rejects(new Error('fail'));
      await expect(purgedDocsCache.get('tom')).to.be.rejectedWith('fail');
    });
  });

  describe('set', () => {
    it('should set new cache', async () => {
      purgedDbObj.get.rejects({ status: 404 });
      purgedDbObj.put.resolves();
      await purgedDocsCache.set('michael', [3, 2, 1]);

      expect(purgedDbObj.get.args).to.deep.equal([['purged-docs-michael']]);
      expect(purgedDbObj.put.args).to.deep.equal([[{
        _id: 'purged-docs-michael',
        doc_ids: [1, 2, 3],
      }]]);
    });

    it('should overwrite existent cache', async () => {
      purgedDbObj.get.resolves({
        _id: 'purged-docs-tim',
        _rev: '2-fdhnj',
        doc_ids: [7, 8, 9],
      });
      purgedDbObj.put.resolves();
      await purgedDocsCache.set('tim', [13, 11, 231]);

      expect(purgedDbObj.get.args).to.deep.equal([['purged-docs-tim']]);
      expect(purgedDbObj.put.args).to.deep.equal([[{
        _id: 'purged-docs-tim',
        _rev: '2-fdhnj',
        doc_ids: [11, 13, 231],
      }]]);
    });

    it('should handle conflicts', async () => {
      purgedDbObj.get.resolves({ _id: 'purged-docs-john', doc_ids: [7, 8, 9] });
      purgedDbObj.put.rejects({ status: 409 });
      await purgedDocsCache.set('john', [1]);
    });

    it('should do nothing when no ids are passed', async () => {
      await purgedDocsCache.set('john');
      await purgedDocsCache.set('john', 'DS?Ada');
      await purgedDocsCache.set('john', false);
    });

    it('should throw other errors', async () => {
      purgedDbObj.get.resolves({ status: 404 });
      purgedDbObj.put.rejects(new Error('this is bad'));
      await expect(purgedDocsCache.set('tom', [2])).to.be.rejectedWith('this is bad');
    });
  });

  describe('clear', () => {
    it('should do nothing for no username', async () => {
      await purgedDocsCache.clear();
    });

    it('should remove existent cache', async () => {
      purgedDbObj.get.resolves({ some: 'doc' });
      purgedDbObj.remove.resolves();
      await purgedDocsCache.clear('polar');
      expect(purgedDbObj.get.args).to.deep.equal([['purged-docs-polar']]);
      expect(purgedDbObj.remove.args).to.deep.equal([[{ some: 'doc' }]]);
    });

    it('should handle missing cache', async () => {
      purgedDbObj.get.rejects({ status: 404 });
      await purgedDocsCache.clear('mice');
      expect(purgedDbObj.get.args).to.deep.equal([['purged-docs-mice']]);
      expect(purgedDbObj.remove.callCount).to.equal(0);
    });

    it('should handle conflicts', async () => {
      purgedDbObj.get.resolves({ _id: 'purged-docs-phil' });
      purgedDbObj.remove.rejects({ status: 409 });
      await purgedDocsCache.clear('phil');
      expect(purgedDbObj.get.args).to.deep.equal([['purged-docs-phil']]);
      expect(purgedDbObj.remove.args).to.deep.equal([[{ _id: 'purged-docs-phil' }]]);
    });

    it('should throw other errors', async () => {
      purgedDbObj.get.resolves({ _id: 'purged-docs-pod' });
      purgedDbObj.remove.rejects(new Error('boom'));
      await expect(purgedDocsCache.clear('pod')).to.be.rejectedWith('boom');
    });
  });

  describe('getCacheDoc retry', () => {
    it('should retry on ECONNRESET and succeed', async () => {
      purgedDbObj.get
        .onFirstCall().rejects({ code: 'ECONNRESET' })
        .onSecondCall().resolves({ doc_ids: [1, 2] });

      const result = await purgedDocsCache.get('user1');
      expect(result).to.deep.equal([1, 2]);
      expect(purgedDbObj.get.callCount).to.equal(2);
      expect(setTimeoutPromiseStub.callCount).to.equal(1);
      expect(setTimeoutPromiseStub.args[0]).to.deep.equal([1000]);
    });

    it('should retry up to 3 times on ECONNRESET', async () => {
      purgedDbObj.get
        .onCall(0).rejects({ code: 'ECONNRESET' })
        .onCall(1).rejects({ code: 'ECONNRESET' })
        .onCall(2).rejects({ code: 'ECONNRESET' })
        .onCall(3).resolves({ doc_ids: [5] });

      const result = await purgedDocsCache.get('user2');
      expect(result).to.deep.equal([5]);
      expect(purgedDbObj.get.callCount).to.equal(4);
      expect(setTimeoutPromiseStub.callCount).to.equal(3);
      expect(setTimeoutPromiseStub.alwaysCalledWith(1000)).to.equal(true);
    });

    it('should throw ECONNRESET after retries are exhausted', async () => {
      const econnreset = { code: 'ECONNRESET' };
      purgedDbObj.get.rejects(econnreset);

      await expect(purgedDocsCache.get('user3')).to.be.rejectedWith(econnreset);
      expect(purgedDbObj.get.callCount).to.equal(4);
      expect(setTimeoutPromiseStub.callCount).to.equal(3);
      expect(setTimeoutPromiseStub.alwaysCalledWith(1000)).to.equal(true);
    });

    it('should not retry on non-ECONNRESET errors', async () => {
      purgedDbObj.get.rejects(new Error('something else'));

      await expect(purgedDocsCache.get('user4')).to.be.rejectedWith('something else');
      expect(purgedDbObj.get.callCount).to.equal(1);
      expect(setTimeoutPromiseStub.callCount).to.equal(0);
    });

    it('should not retry on 404 errors', async () => {
      purgedDbObj.get.rejects({ status: 404 });

      const result = await purgedDocsCache.get('user5');
      expect(result).to.equal(undefined);
      expect(purgedDbObj.get.callCount).to.equal(1);
      expect(setTimeoutPromiseStub.callCount).to.equal(0);
    });

    it('should retry ECONNRESET then handle 404', async () => {
      purgedDbObj.get
        .onFirstCall().rejects({ code: 'ECONNRESET' })
        .onSecondCall().rejects({ status: 404 });

      const result = await purgedDocsCache.get('user6');
      expect(result).to.equal(undefined);
      expect(purgedDbObj.get.callCount).to.equal(2);
      expect(setTimeoutPromiseStub.callCount).to.equal(1);
      expect(setTimeoutPromiseStub.args[0]).to.deep.equal([1000]);
    });
  });

  describe('getCacheDatabase', () => {
    it('should get db when not set', async () => {
      const result = await purgedDocsCache.__get__('getCacheDatabase')();
      expect(result).to.equal(purgedDbObj);
      expect(db.get.args).to.deep.equal([['medic-purged-cache']]);
    });

    it('should get existent db on subsequent calls', async () => {
      expect(await purgedDocsCache.__get__('getCacheDatabase')()).to.equal(purgedDbObj);
      expect(await purgedDocsCache.__get__('getCacheDatabase')()).to.equal(purgedDbObj);
      expect(await purgedDocsCache.__get__('getCacheDatabase')()).to.equal(purgedDbObj);
      expect(await purgedDocsCache.__get__('getCacheDatabase')()).to.equal(purgedDbObj);

      expect(db.get.args).to.deep.equal([['medic-purged-cache']]);
    });

    it('should wait for wipe before getting the db', async () => {
      await purgedDocsCache.__get__('getCacheDatabase')();
      sinon.resetHistory();

      purgedDocsCache.wipe();
      const p1 = purgedDocsCache.__get__('getCacheDatabase')();
      const p2 = purgedDocsCache.__get__('getCacheDatabase')();
      const p3 = purgedDocsCache.__get__('getCacheDatabase')();

      expect(await p1).to.equal(purgedDbObj);
      expect(await p2).to.equal(purgedDbObj);
      expect(await p3).to.equal(purgedDbObj);

      expect(db.get.args).to.deep.equal([['medic-purged-cache']]);
    });
  });
});
