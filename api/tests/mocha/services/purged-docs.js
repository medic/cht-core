const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const db = require('../../../src/db');
const dbWatcher = require('../../../src/services/db-watcher');
const environment = require('../../../src/environment');
const purgingUtils = require('@medic/purging-utils');
const config = require('../../../src/config');
const configWatcher = require('../../../src/services/config-watcher');
const _ = require('lodash');

let service;

describe('Purged Docs service', () => {
  beforeEach(() => {
    sinon.stub(db, 'wipeCacheDb').resolves();
    sinon.stub(db.cache, 'remove').resolves();
    sinon.stub(configWatcher, 'watch');
    sinon.stub(dbWatcher, 'medic');
    sinon.stub(dbWatcher, 'sentinel');
    sinon.stub(dbWatcher, 'users');
    service = rewire('../../../src/services/purged-docs');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('listen', () => {
    it('should listen to sentinel, medic and users changes once', () => {
      const listen = service.__get__('listen');
      listen();
      chai.expect(dbWatcher.medic.callCount).to.equal(1);
      chai.expect(dbWatcher.sentinel.callCount).to.equal(1);
      chai.expect(dbWatcher.users.callCount).to.equal(1);
      chai.expect(configWatcher.watch.callCount).to.equal(1);
    });

    it('should process sentinel changes correctly', () => {
      const listen = service.__get__('listen');
      listen();
      const onChangeCallback = dbWatcher.sentinel.args[0][0];
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
      chai.expect(db.cache.remove.callCount).to.equal(0);
    });

    it('should process medic changes correctly', async () => {
      const listen = service.__get__('listen');
      listen();
      const onChangeCallback = dbWatcher.medic.args[0][0];

      chai.expect(onChangeCallback).to.be.a('function');
      sinon.stub(db.cache, 'get').callsFake(id => ({ _id: id }));

      await onChangeCallback({ id: 'random', seq: 1 });
      chai.expect(db.wipeCacheDb.callCount).to.equal(0);

      await onChangeCallback({ id: 'random-other', seq: 2 });
      chai.expect(db.cache.get.callCount).to.equal(0);
      chai.expect(db.cache.remove.callCount).to.equal(0);

      await onChangeCallback({
        id: 'org.couchdb.user:rnduser',
        changes: [{ rev: '2-something' }],
        deleted: true,
        seq: 3,
      });
      chai.expect(db.cache.get.callCount).to.equal(1);
      chai.expect(db.cache.remove.callCount).to.equal(1);
      chai.expect(db.cache.remove.args[0]).to.deep.equal([{ _id: 'purged-docs-rnduser' }]);

      await onChangeCallback({ id: 'org.couchdb.user:some-other-user', changes: [{ rev: '1-something' }], seq: 4 });
      chai.expect(db.cache.get.callCount).to.equal(2);
      chai.expect(db.cache.remove.callCount).to.equal(2);
      chai.expect(db.cache.remove.args[1]).to.deep.equal([{ _id: 'purged-docs-some-other-user' }]);

      chai.expect(db.wipeCacheDb.callCount).to.equal(0);

      db.cache.get.rejects({ status: 404 });
      await onChangeCallback({ id: 'org.couchdb.user:whatever', changes: [{ rev: '1-something' }], seq: 4 });
      chai.expect(db.cache.get.callCount).to.equal(3);
      chai.expect(db.cache.remove.callCount).to.equal(2);
    });

    it('should process users changes correctly', async () => {
      const listen = service.__get__('listen');
      sinon.stub(db.cache, 'get').callsFake(id => ({ _id: id }));
      listen();
      const onChangeCallback = dbWatcher.users.args[0][0];
      chai.expect(onChangeCallback).to.be.a('function');

      await onChangeCallback({ id: 'random', seq: 1 });
      chai.expect(db.wipeCacheDb.callCount).to.equal(0);

      await onChangeCallback({ id: 'random-other', seq: 2 });
      chai.expect(db.cache.remove.callCount).to.equal(0);

      await onChangeCallback({
        id: 'org.couchdb.user:rnduser',
        changes: [{ rev: '2-something' }],
        deleted: true,
        seq: 3,
      });
      chai.expect(db.cache.remove.callCount).to.equal(1);
      chai.expect(db.cache.remove.args[0]).to.deep.equal([{ _id: 'purged-docs-rnduser' }]);

      await onChangeCallback({ id: 'org.couchdb.user:some-other-user', changes: [{ rev: '1-something' }], seq: 4 });
      chai.expect(db.cache.remove.callCount).to.equal(2);
      chai.expect(db.cache.remove.args[1]).to.deep.equal([{ _id: 'purged-docs-some-other-user' }]);

      chai.expect(db.wipeCacheDb.callCount).to.equal(0);
    });

    it('should process config changes correctly', () => {
      const configKey = 'district_admins_access_unallocated_messages';
      sinon.stub(config, 'get');

      config.get.returns('true');
      let onSettingsChangeCb;
      configWatcher.watch.callsFake(callback => onSettingsChangeCb = callback);
      const listen = service.__get__('listen');

      listen();
      chai.expect(onSettingsChangeCb).to.be.a('function');
      onSettingsChangeCb();
      chai.expect(db.wipeCacheDb.callCount).to.equal(0);
      chai.expect(config.get.args).to.deep.equal([[configKey], [configKey]]);

      config.get.returns('false');
      onSettingsChangeCb();
      chai.expect(config.get.callCount).to.equal(3);
      chai.expect(db.wipeCacheDb.callCount).to.equal(1);

      onSettingsChangeCb();
      chai.expect(config.get.callCount).to.equal(4);
      chai.expect(db.wipeCacheDb.callCount).to.equal(1);

      config.get.returns('true');
      onSettingsChangeCb();
      chai.expect(config.get.callCount).to.equal(5);
      chai.expect(db.wipeCacheDb.callCount).to.equal(2);
    });
  });

  describe('getPurgedIds', () => {
    describe('getCacheDocId', () => {
      it('should return id based on user name', () => {

        const getCacheDocId = service.__get__('getCacheDocId');
        const doc1 = getCacheDocId('test');
        const doc2 = getCacheDocId('mike');
        const doc3 = getCacheDocId('john');

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

      return service.getPurgedIds({ roles: [ 'a', 'b' ], name: 'meka' }, ids).then(result => {
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
      return service.getPurgedIds({ roles: ['a', 'b'], name: 'meh' }, ids).then(result => {
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
      const userCtx = { roles: [ 'a', 'b' ], name: 'omg' };

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

      return service.getPurgedIds({ roles: [ 'a', 'b' ], name: 'tom' }, ids).then(result => {
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
