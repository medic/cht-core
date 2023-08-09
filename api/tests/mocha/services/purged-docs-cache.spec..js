const sinon = require('sinon');
const chai = require('chai').use(require('chai-as-promised'));
const expect = chai.expect;
const rewire = require('rewire');

const db = require('../../../src/db');
const environment = require('../../../src/environment');

let purgedDocsCache;
let purgedDbObj;

describe('Purged docs cache', () => {
  beforeEach(() => {
    purgedDbObj = { destroy: sinon.stub().resolves() };
    sinon.stub(db, 'get').returns(purgedDbObj);
    sinon.stub(environment, 'db').value('medic');
    purgedDocsCache = rewire('../../../src/services/purged-docs-cache');
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
      await purgedDocsCache.get();
      sinon.resetHistory();

      await purgedDocsCache.wipe();
      expect(db.get.callCount).to.equal(0);
      expect(purgedDbObj.destroy.callCount).to.equal(1);
      expect(purgedDocsCache.__get__('destroyPromise')).to.equal(null);
    });

    it('should not destroy multiple times', async () => {
      await purgedDocsCache.get();
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
    it('should get db when not set', async () => {
      const result = await purgedDocsCache.get();
      expect(result).to.equal(purgedDbObj);
      expect(db.get.args).to.deep.equal([[`medic-purged-cache`]]);
    });

    it('should get existent db on subsequent calls', async () => {
      expect(await purgedDocsCache.get()).to.equal(purgedDbObj);
      expect(await purgedDocsCache.get()).to.equal(purgedDbObj);
      expect(await purgedDocsCache.get()).to.equal(purgedDbObj);
      expect(await purgedDocsCache.get()).to.equal(purgedDbObj);

      expect(db.get.args).to.deep.equal([[`medic-purged-cache`]]);
    });

    it('should wait for wipe before getting the db', async () => {
      await purgedDocsCache.get();
      sinon.resetHistory();

      purgedDocsCache.wipe();
      const p1 = purgedDocsCache.get();
      const p2 = purgedDocsCache.get();
      const p3 = purgedDocsCache.get();

      expect(await p1).to.equal(purgedDbObj);
      expect(await p2).to.equal(purgedDbObj);
      expect(await p3).to.equal(purgedDbObj);

      expect(db.get.args).to.deep.equal([[`medic-purged-cache`]]);
    });
  });
});
