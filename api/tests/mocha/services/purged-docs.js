const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const db = require('../../../src/db');
const environment = require('../../../src/environment');
const purgingUtils = require('@medic/purging-utils');
const _ = require('lodash');

let service;
let recursiveOn;

describe('Purged Docs service', () => {
  beforeEach(() => {
    recursiveOn = sinon.stub();
    recursiveOn.callsFake(() => {
      const promise = sinon.stub().resolves();
      promise.on = recursiveOn;
      return promise;
    });
    sinon.stub(db.sentinel, 'changes').returns({ on: recursiveOn });
    sinon.stub(db, 'wipeCacheDb').resolves();
    service = rewire('../../../src/services/purged-docs');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('listen', () => {
    it('should listen to sentinel changes once', () => {
      const listen = service.__get__('listen');
      listen();
      chai.expect(db.sentinel.changes.callCount).to.equal(1);
      chai.expect(db.sentinel.changes.args[0]).to.deep.equal([{ live: true, since: 'now' }]);
    });

    it('should process changes correctly', () => {
      const listen = service.__get__('listen');
      let onChangeCallback;
      recursiveOn.withArgs('change').callsFake((e, callback) => {
        onChangeCallback = callback;
        const promise = sinon.stub().resolves();
        promise.on = recursiveOn;
        return promise;
      });
      listen();
      chai.expect(onChangeCallback).to.be.a('function');

      onChangeCallback({ id: 'random-info', seq: 1 });
      chai.expect(db.wipeCacheDb.callCount).to.equal(0);
      onChangeCallback({ id: 'random-other-info', seq: 2 });
      chai.expect(db.wipeCacheDb.callCount).to.equal(0);
      onChangeCallback({ id: 'purgelog:some-random-date', changes: [{ rev: '2-something' }], deleted: true, seq: 3 });
      chai.expect(db.wipeCacheDb.callCount).to.equal(0);
      onChangeCallback({ id: 'purgelog:some-other-date', changes: [{ rev: '1-something' }], seq: 4 });
      chai.expect(db.wipeCacheDb.callCount).to.equal(1);

      onChangeCallback({ id: 'purgelog:111', changes: [{ rev: '1-bla123' }], seq: 5 });
      chai.expect(db.wipeCacheDb.callCount).to.equal(2);

      onChangeCallback({ id: 'purgelog:2222', changes: [{ rev: '1-post' }], seq: 6 });
      chai.expect(db.wipeCacheDb.callCount).to.equal(3);
    });

    it('should restart listener on error', () => {
      const listen = service.__get__('listen');
      let onChangeCallback;
      let onErrorCallback;

      recursiveOn.withArgs('change').callsFake((e, callback) => {
        onChangeCallback = callback;
        const promise = sinon.stub().resolves();
        promise.on = recursiveOn;
        return promise;
      });
      recursiveOn.withArgs('error').callsFake((e, callback) => {
        onErrorCallback = callback;
        const promise = sinon.stub().resolves();
        promise.on = recursiveOn;
        return promise;
      });

      listen();
      chai.expect(db.sentinel.changes.callCount).to.equal(1);
      chai.expect(db.sentinel.changes.args[0]).to.deep.equal([{ live: true, since: 'now' }]);
      onErrorCallback();
      chai.expect(db.sentinel.changes.callCount).to.equal(2);
      chai.expect(db.sentinel.changes.args[1]).to.deep.equal([{ live: true, since: 'now' }]);
      onChangeCallback({ id: 'some-info', changes: [{ rev: '1-post' }], seq: 6 });
      onErrorCallback();
      chai.expect(db.sentinel.changes.callCount).to.equal(3);
      chai.expect(db.sentinel.changes.args[2]).to.deep.equal([{ live: true, since: 6 }]);
    });
  });

  describe('getPurgedIds', () => {
    describe('getCacheDocId', () => {
      it('should return username', () => {

        const getCacheDocId = service.__get__('getCacheDocId');
        const doc1 = getCacheDocId({ username: 'test' });
        const doc2 = getCacheDocId({ username: 'mike' });
        const doc3 = getCacheDocId({ username: 'john' });

        chai.expect(doc1).to.equal('purged-docs-test');
        chai.expect(doc2).to.equal('purged-docs-mike');
        chai.expect(doc3).to.equal('purged-docs-john');
      });
    });

    it('should return empty list when no ids provided', () => {
      return service.getPurgedIds(['a', 'b']).then(result => {
        chai.expect(result).to.deep.equal([]);
      });
    });

    it('should return empty when no roles provided', () => {
      return service.getPurgedIds({ }, ['a']).then(result => {
        chai.expect(result).to.deep.equal([]);
      });
    });

    it('should respond from cache if cache is already available', () => {
      const ids = [1, 2, 3, 4, 5, 6];
      const cachedPurgedIds = [1, 4, 6];
      sinon.stub(db.cache, 'get').resolves({ doc_ids: cachedPurgedIds, _id: 'what', _rev: '1' });

      return service.getPurgedIds({ roles: [ 'a', 'b' ], username: 'meka' }, ids).then(result => {
        chai.expect(result).to.deep.equal(cachedPurgedIds);
        chai.expect(db.cache.get.callCount).to.equal(1);
        chai.expect(db.cache.get.args[0]).to.deep.equal(['purged-docs-meka']);
      });
    });

    it('should return empty list when purgeDb does not exist', () => {
      const ids = [1, 2, 3, 4];
      sinon.stub(purgingUtils, 'getRoleHash').returns('some_random_hash');
      sinon.stub(purgingUtils, 'getPurgeDbName').returns('purge-db-name');
      sinon.stub(db, 'exists').resolves(false);
      sinon.stub(db.cache, 'get').rejects({ status: 404 });
      return service.getPurgedIds({ roles: ['a', 'b'], username: 'meh' }, ids).then(result => {
        chai.expect(result).to.deep.equal([]);
      });
    });

    it('should return empty list when purgeDB has been deleted', () => {
      sinon.stub(purgingUtils, 'getRoleHash').returns('some_random_hash');
      sinon.stub(purgingUtils, 'getPurgeDbName').returns('purge-db-name');
      const purgeDb = { changes: sinon.stub().resolves({ results: [{ id: 'purged:1' }] }) };
      sinon.stub(db, 'exists')
        .onCall(0).resolves(purgeDb)
        .onCall(1).resolves(false);
      sinon.stub(db, 'close');
      sinon.stub(db.cache, 'get').rejects({ status: 404 });
      sinon.stub(db.cache, 'put').resolves();
      const userCtx = { roles: [ 'a', 'b' ], username: 'omg' };

      return service
        .getPurgedIds(userCtx, ['1', '2', '3'])
        .then(result => {
          chai.expect(result).to.deep.equal(['1']);
          chai.expect(db.exists.callCount).to.equal(1);
          chai.expect(db.close.callCount).to.equal(1);
          chai.expect(db.close.args[0]).to.deep.equal([purgeDb]);
          return service.getPurgedIds(userCtx, ['4', '5', '6']);
        })
        .then(result => {
          // second time we call `db.exists` it returns false
          chai.expect(result).to.deep.equal([]);
          chai.expect(db.exists.callCount).to.equal(2);
          chai.expect(db.close.callCount).to.equal(1);
        });
    });

    it('should throw an error when the changes request throws an error', () => {
      sinon.stub(purgingUtils, 'getRoleHash').returns('some_random_hash');
      sinon.stub(purgingUtils, 'getPurgeDbName').returns('purge-db-name');
      const purgeDb = { changes: sinon.stub().rejects({ status: 500 }) };
      sinon.stub(db, 'exists').resolves(purgeDb);
      sinon.stub(db, 'close');

      sinon.stub(db.cache, 'get').rejects({ status: 404 });
      sinon.stub(db.cache, 'put').resolves();

      return service
        .getPurgedIds({ roles: [ 'a', 'b' ] }, ['1', '2', '3'])
        .then(result => {
          chai.expect(result).to.deep('should have thrown');
        })
        .catch(err => {
          chai.expect(err).to.deep.equal({ status: 500 });
          chai.expect(db.close.callCount).to.equal(1);
          chai.expect(db.close.args[0]).to.deep.equal([purgeDb]);
        });
    });

    it('should request changes from correct purge db depending on roles and save cache', () => {
      const ids = ['1', '2', '3', '4', '5', '6'];
      sinon.stub(purgingUtils, 'getRoleHash').returns('some_random_hash');
      sinon.stub(purgingUtils, 'getPurgeDbName').returns('purge-db-name');
      sinon.stub(db.cache, 'get').rejects({ status: 404 });
      sinon.stub(db.cache, 'put').resolves();
      const purgeDb = { changes: sinon.stub() };
      sinon.stub(db, 'exists').resolves(purgeDb);
      sinon.stub(db, 'close');
      purgeDb.changes.resolves({
        last_seq: '111-seq',
        results: [
          { id: 'purged:2' },
          { id: 'purged:3' },
          { id: 'purged:4' },
          { id: 'purged:6' },
        ]
      });

      return service.getPurgedIds({ roles: [ 'a', 'b' ], username: 'tom' }, ids).then(result => {
        chai.expect(result).to.deep.equal(['2', '3', '4', '6']);

        chai.expect(db.cache.get.callCount).to.equal(2);
        chai.expect(db.cache.get.args[0]).to.deep.equal(['purged-docs-tom']);

        chai.expect(purgingUtils.getPurgeDbName.callCount).to.equal(1);
        chai.expect(purgingUtils.getPurgeDbName.args[0]).to.deep.equal([environment.db, 'some_random_hash']);
        chai.expect(purgingUtils.getRoleHash.callCount).to.equal(1);
        chai.expect(purgingUtils.getRoleHash.args[0]).to.deep.equal([['a', 'b']]);
        chai.expect(purgeDb.changes.callCount).to.equal(1);
        chai.expect(purgeDb.changes.args[0]).to.deep.equal([{
          doc_ids: ['purged:1', 'purged:2', 'purged:3', 'purged:4', 'purged:5', 'purged:6'],
          batch_size: ids.length + 1,
          seq_interval: ids.length
        }]);

        chai.expect(db.cache.put.callCount).to.equal(1);
        chai.expect(db.cache.put.args[0][0]).to.deep.equal({ _id: 'purged-docs-tom', doc_ids: result });
        chai.expect(db.close.callCount).to.equal(1);
        chai.expect(db.close.args[0]).to.deep.equal([purgeDb]);
      });
    });

    it('should skip deleted purges', () => {
      const ids = ['1', '2', '3', '4', '5', '6'];
      sinon.stub(db.cache, 'get').rejects({ status: 404 });
      sinon.stub(db.cache, 'put').resolves();
      const purgeDb = { changes: sinon.stub() };
      sinon.stub(db, 'exists').resolves(purgeDb);
      sinon.stub(db, 'close');
      purgeDb.changes.resolves({
        last_seq: '111-seq',
        results: [
          { id: 'purged:2' },
          { id: 'purged:3', deleted: true },
          { id: 'purged:4', deleted: true },
          { id: 'purged:6' },
        ]
      });

      return service.getPurgedIds({ roles: [ 'a', 'b' ] }, ids).then(result => {
        chai.expect(result).to.deep.equal(['2', '6']);
        chai.expect(purgeDb.changes.callCount).to.equal(1);
        chai.expect(purgeDb.changes.args[0]).to.deep.equal([{
          doc_ids: ['purged:1', 'purged:2', 'purged:3', 'purged:4', 'purged:5', 'purged:6'],
          batch_size: ids.length + 1,
          seq_interval: ids.length
        }]);
        chai.expect(db.close.callCount).to.equal(1);
        chai.expect(db.close.args[0]).to.deep.equal([purgeDb]);
      });
    });

    it('should throw db changes errors', () => {
      const ids = ['1', '2', '3', '4', '5', '6'];
      sinon.stub(db.cache, 'get').rejects({ status: 404 });
      sinon.stub(db.cache, 'put').resolves();
      const purgeDb = { changes: sinon.stub() };
      sinon.stub(db, 'exists').resolves(purgeDb);
      sinon.stub(db, 'close');
      purgeDb.changes.rejects({ some: 'err' });

      return service.getPurgedIds({ roles: [ 'a', 'b' ] }, ids).catch(err => {
        chai.expect(err).to.deep.equal({ some: 'err' });
        chai.expect(purgeDb.changes.callCount).to.equal(1);
        chai.expect(purgeDb.changes.args[0]).to.deep.equal([{
          doc_ids: ['purged:1', 'purged:2', 'purged:3', 'purged:4', 'purged:5', 'purged:6'],
          batch_size: ids.length + 1,
          seq_interval: ids.length
        }]);
        chai.expect(db.close.callCount).to.equal(1);
        chai.expect(db.close.args[0]).to.deep.equal([purgeDb]);
      });
    });
  });

  describe('getUnPurgedIds', () => {
    it('should call getPurgedIds with correct params and return difference', () => {
      const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
      const purgedIds = ['f', 'a', 'd'];
      service.__set__('getPurgedIds', sinon.stub().resolves(purgedIds));
      //sinon.stub(service, 'getPurgedIds').resolves(purgedIds);
      return service.getUnPurgedIds(['a', 'b'], ids).then(result => {
        chai.expect(result).to.deep.equal(_.difference(ids, purgedIds));
        chai.expect(service.__get__('getPurgedIds').callCount).to.equal(1);
        chai.expect(service.__get__('getPurgedIds').args[0]).to.deep.equal([['a', 'b'], ids]);
      });
    });
  });

  describe('getPurgeDb', () => {
    it('should throw an error when the db does not exist', () => {
      sinon.stub(purgingUtils, 'getRoleHash').returns('some_random_hash');
      sinon.stub(purgingUtils, 'getPurgeDbName').returns('purge-db-name');
      sinon.stub(db, 'exists').resolves(false);

      return service
        .__get__('getPurgeDb')(['role1', 'role2'])
        .then(r => chai.expect(r).to.equal('Should have thrown'))
        .catch(err => {
          chai.expect(err.message).to.deep.equal('not_found');
          chai.expect(db.exists.callCount).to.equal(1);
          chai.expect(db.exists.args[0]).to.deep.equal(['purge-db-name']);
          chai.expect(purgingUtils.getRoleHash.callCount).to.equal(1);
          chai.expect(purgingUtils.getRoleHash.args[0]).to.deep.equal([['role1', 'role2']]);
          chai.expect(purgingUtils.getPurgeDbName.callCount).to.equal(1);
          chai.expect(purgingUtils.getPurgeDbName.args[0][1]).to.equal('some_random_hash');
        });
    });

    it('should return the pouchdb object when the db exists', () => {
      sinon.stub(purgingUtils, 'getRoleHash').returns('some_random_hash');
      sinon.stub(purgingUtils, 'getPurgeDbName').returns('purge-db-name');
      sinon.stub(db, 'exists').resolves('my db object');

      return service
        .__get__('getPurgeDb')(['role1', 'role2'])
        .then(result => {
          chai.expect(db.exists.callCount).to.equal(1);
          chai.expect(db.exists.args[0]).to.deep.equal(['purge-db-name']);
          chai.expect(purgingUtils.getRoleHash.callCount).to.equal(1);
          chai.expect(purgingUtils.getRoleHash.args[0]).to.deep.equal([['role1', 'role2']]);
          chai.expect(purgingUtils.getPurgeDbName.callCount).to.equal(1);
          chai.expect(purgingUtils.getPurgeDbName.args[0][1]).to.equal('some_random_hash');
          chai.expect(result).to.equal('my db object');
        });
    });
  });
});
