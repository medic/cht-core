import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { SessionService } from '@mm-services/session.service';
import { RulesEngineService } from '@mm-services/rules-engine.service';
import { DbSyncRetryService } from '@mm-services/db-sync-retry.service';
import { DBSyncService } from '@mm-services/db-sync.service';
import { DbService } from '@mm-services/db.service';
import { AuthService } from '@mm-services/auth.service';

describe('DBSync service', () => {
  let service:DBSyncService;
  let to;
  let from;
  let isOnlineOnly;
  let userCtx;
  let sync;
  let syncResult;
  let recursiveOnSync;
  let hasAuth;
  let recursiveOnTo;
  let recursiveOnFrom;
  let replicationResult;
  let getItem;
  let setItem;
  let dbSyncRetry;
  let rulesEngine;

  let localMedicDb;
  let localMetaDb;
  let remoteMedicDb;
  let remoteMetaDb;
  let db;

  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers();

    replicationResult = () => Promise.resolve();
    to = sinon.stub();
    to.events = {};
    recursiveOnTo = sinon.stub();
    recursiveOnTo.callsFake((event, fn) => {
      to.events[event] = fn;
      const promise = replicationResult();
      promise.on = recursiveOnTo;
      return promise;
    });
    to.returns({ on: recursiveOnTo });
    from = sinon.stub();
    from.events = {};
    recursiveOnFrom = sinon.stub();
    recursiveOnFrom.callsFake((event, fn) => {
      from.events[event] = fn;
      const promise = replicationResult();
      promise.on = recursiveOnFrom;
      return promise;
    });
    from.returns({ on: recursiveOnFrom });
    isOnlineOnly = sinon.stub();
    userCtx = sinon.stub();
    sync = sinon.stub();
    sync.events = {};
    syncResult = () => Promise.resolve();
    recursiveOnSync = sinon.stub().callsFake((event, fn) => {
      sync.events[event] = fn;
      const promise = syncResult();
      promise.on = recursiveOnSync;
      return promise;
    });
    sync.returns({ on: recursiveOnSync });
    hasAuth = sinon.stub();
    dbSyncRetry = sinon.stub();
    rulesEngine = { monitorExternalChanges: sinon.stub() };

    localMedicDb = {
      replicate: { to: to, from: from },
      info: sinon.stub().resolves({ update_seq: 99 }),
    };
    localMetaDb = {
      sync,
      info: sinon.stub().resolves({}),
      get: sinon.stub().resolves({}),
      put: sinon.stub(),
    };
    remoteMetaDb = {};
    remoteMedicDb = {};

    db = sinon.stub().returns(localMedicDb);
    db.withArgs({ remote: true }).returns(remoteMedicDb);
    db.withArgs({ meta: true }).returns(localMetaDb);
    db.withArgs({ remote: true, meta: true }).returns(remoteMetaDb);

    getItem = sinon.stub(window.localStorage, 'getItem');
    setItem = sinon.stub(window.localStorage, 'setItem');

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: { get: db } },
        { provide: SessionService, useValue: { isOnlineOnly, userCtx } },
        { provide: AuthService, useValue: { has: hasAuth } },
        { provide: DbSyncRetryService, useValue: { retryForbiddenFailure: dbSyncRetry } },
        { provide: RulesEngineService, useValue: rulesEngine },
      ]
    });

    service = TestBed.inject(DBSyncService);
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
  });

  describe('sync', () => {
    it('does nothing for admins', () => {
      isOnlineOnly.returns(true);
      return service.sync().then(() => {
        expect(to.callCount).to.equal(0);
        expect(from.callCount).to.equal(0);
      });
    });

    it('starts bi-direction replication for non-admin', () => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);

      return service.sync().then(() => {
        expect(hasAuth.callCount).to.equal(1);
        expect(hasAuth.args[0][0]).to.equal('can_edit');
        expect(from.callCount).to.equal(1);
        expect(from.args[0][1]).to.have.keys('heartbeat', 'timeout', 'batch_size');
        expect(from.args[0][1]).to.not.have.keys('filter', 'checkpoint');
        expect(to.callCount).to.equal(1);
        expect(to.args[0][1]).to.have.keys('filter', 'checkpoint', 'batch_size');
      });
    });

    it('syncs automatically after interval', async () => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);

      await service.sync();
      expect(from.callCount).to.equal(1);
      clock.tick(5 * 60 * 1000 + 1);
      await Promise.resolve();
      expect(from.callCount).to.equal(2);
    });

    it('does not attempt sync while offline', () => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);

      service.setOnlineStatus(false);
      return service.sync().then(() => {
        expect(from.callCount).to.equal(0);
      });
    });

    it('multiple calls to sync yield one attempt', () => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);

      service.sync();
      return service.sync().then(() => {
        expect(from.callCount).to.equal(1);
      });
    });

    it('force sync while offline still syncs', () => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);

      service.setOnlineStatus(false);
      return service.sync(true).then(() => {
        expect(from.callCount).to.equal(1);
      });
    });

    it('error in replication with no docs to send results in "unknown" status', () => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);

      replicationResult = () => Promise.reject('error');
      const onUpdate = sinon.stub();
      service.subscribe(onUpdate);
      localMedicDb.info.resolves({ update_seq: 100 });
      getItem.returns('100');

      return service.sync().then(() => {
        expect(onUpdate.callCount).to.eq(2);
        expect(onUpdate.args[0][0]).to.deep.eq({ state: 'inProgress' });
        expect(onUpdate.args[1][0]).to.deep.eq({ state: 'unknown' });
      });
    });

    it('error in replication results in "required" status', () => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);

      replicationResult = () => Promise.reject('error');
      const onUpdate = sinon.stub();
      service.subscribe(onUpdate);

      return service.sync().then(() => {
        expect(onUpdate.callCount).to.eq(2);
        expect(onUpdate.args[0][0]).to.deep.eq({ state: 'inProgress' });
        expect(onUpdate.args[1][0]).to.deep.eq({ to: 'required', from: 'required' });
      });
    });

    it('completed replication results in "success" status', () => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);

      replicationResult = () => Promise.resolve({ some: 'info' });
      const onUpdate = sinon.stub();
      service.subscribe(onUpdate);

      return service.sync().then(() => {
        expect(onUpdate.callCount).to.eq(2);
        expect(onUpdate.args[0][0]).to.deep.eq({ state: 'inProgress' });
        expect(onUpdate.args[1][0]).to.deep.eq({ to: 'success', from: 'success' });
      });
    });

    it('sync scenarios based on connectivity state', async() => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);

      // sync with default online status
      await service.sync();
      expect(from.callCount).to.equal(1);
      // go offline, don't attempt to sync
      service.setOnlineStatus(false);
      clock.tick(25 * 60 * 1000 + 1);
      await Promise.resolve();
      expect(from.callCount).to.equal(1);

      // when you come back online eventually, sync immediately
      service.setOnlineStatus(true);
      expect(from.callCount).to.equal(1);

      // wait for the inprogress sync to complete before continuing the test
      await service.sync();
      expect(from.callCount).to.equal(2);

      // don't sync if you quickly lose and regain connectivity
      service.setOnlineStatus(false);
      service.setOnlineStatus(true);
      expect(from.callCount).to.equal(2);

      // eventually, sync on the timer
      clock.tick(5 * 60 * 1000 + 1);
      await Promise.resolve();

      expect(from.callCount).to.equal(3);
    });

    it('does not sync to remote if user lacks "can_edit" permission', () => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(false);
      const onUpdate = sinon.stub();
      service.subscribe(onUpdate);

      return service.sync().then(() => {
        expect(hasAuth.callCount).to.equal(1);
        expect(hasAuth.args[0][0]).to.equal('can_edit');
        expect(from.callCount).to.equal(1);
        expect(from.args[0][1]).to.not.have.keys('filter', 'checkpoint');
        expect(to.callCount).to.equal(0);

        expect(onUpdate.callCount).to.eq(2);
        expect(onUpdate.args[0][0]).to.deep.eq({ state: 'inProgress' });
        expect(onUpdate.args[1][0]).to.deep.eq({ to: 'success', from: 'success' });
      });
    });

    describe('retries with smaller batch size', () => {

      let count;
      let retries;

      beforeEach(() => {
        count = 0;

        isOnlineOnly.returns(false);
        hasAuth.resolves(true);

        to.callsFake(() => {
          let promise;
          if (count < retries) {
            // Too big - retry
            count++;
            promise = Promise.reject({ code: 413 });
          } else {
            // small enough - complete
            promise = Promise.resolve();
          }
          promise.on = () => promise;
          return promise;
        });
      });

      it('if request too large', () => {
        retries = 3;
        return service.sync().then(() => {
          expect(hasAuth.callCount).to.equal(1);
          expect(from.callCount).to.equal(1);
          expect(to.callCount).to.equal(4);
          expect(to.args[0][1].batch_size).to.equal(100);
          expect(to.args[1][1].batch_size).to.equal(50);
          expect(to.args[2][1].batch_size).to.equal(25);
          expect(to.args[3][1].batch_size).to.equal(12);
        });
      });

      it('gives up once batch size is 1', () => {
        retries = 100; // should not get this far...
        return service.sync().then(() => {
          expect(from.callCount).to.equal(1);
          expect(to.callCount).to.equal(7);
          expect(to.args[0][1].batch_size).to.equal(100);
          expect(to.args[1][1].batch_size).to.equal(50);
          expect(to.args[2][1].batch_size).to.equal(25);
          expect(to.args[3][1].batch_size).to.equal(12);
          expect(to.args[4][1].batch_size).to.equal(6);
          expect(to.args[5][1].batch_size).to.equal(3);
          expect(to.args[6][1].batch_size).to.equal(1);
        });
      });

    });
  });

  describe('on denied', () => {
    it('should have "denied" handles for every direction', () => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);
      return service.sync().then(() => {
        expect(to.events.denied).to.be.a('function');
        expect(from.events.denied).to.be.a('function');
      });
    });

    it('"denied" from handle does nothing', () => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);
      return service.sync().then(() => {
        from.events.denied();
        expect(dbSyncRetry.callCount).to.equal(0);
      });
    });

    it('"denied" to handle calls DBSyncRetry', () => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);
      return service.sync().then(() => {
        to.events.denied({ some: 'err' });
        expect(dbSyncRetry.callCount).to.equal(1);
        expect(dbSyncRetry.args[0]).to.deep.equal([{ some: 'err' }]);
        expect(to.callCount).to.equal(1);
        expect(from.callCount).to.equal(1);
      });
    });
  });

  describe('on change', () => {
    it('should have "change" handles for the "from" and "to" direction', () => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);
      return service.sync().then(() => {
        expect(to.events.change).to.be.a('function');
        expect(from.events.change).to.be.a('function');
      });
    });

    it('"changes" to handle does nothing', () => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);
      return service.sync().then(() => {
        to.events.change({});
        expect(rulesEngine.monitorExternalChanges.callCount).to.equal(0);
      });
    });

    it('"changes" from handle calls RulesEngine.monitorExternalChanges', () => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);
      const replicationResult = { this: 'is', a: 'replication result' };
      return service.sync().then(() => {
        from.events.change(replicationResult);
        expect(rulesEngine.monitorExternalChanges.callCount).to.equal(1);
        expect(rulesEngine.monitorExternalChanges.args[0]).to.deep.equal([replicationResult]);
        expect(to.callCount).to.equal(1);
        expect(from.callCount).to.equal(1);
      });
    });

    describe('sync meta', () => {
      beforeEach(() => {
        hasAuth.resolves(true);
        isOnlineOnly.returns(false);
      });

      it('should sync meta dbs with no filter', () => {
        return service.sync().then(() => {
          expect(db.withArgs({ meta: true }).callCount).to.equal(1);
          expect(db.withArgs({ meta: true, remote: true }).callCount).to.equal(1);
          expect(localMetaDb.sync.callCount).to.equal(1);
          expect(localMetaDb.sync.args[0][0]).to.equal(remoteMetaDb);
          expect(localMetaDb.sync.args[0][1]).to.equal(undefined);
        });
      });

      it('should write purge log with the current seq after syncing', () => {
        localMetaDb.info.resolves({ update_seq: 100 });
        localMetaDb.get
          .withArgs('_local/purgelog')
          .resolves({ _id: '_local/purgelog', synced_seq: 10, purged_seq: 10 });
        return service.sync().then(() => {
          expect(localMetaDb.info.callCount).to.equal(1);
          expect(localMetaDb.get.callCount).to.equal(1);
          expect(localMetaDb.put.callCount).to.equal(1);
          expect(localMetaDb.put.args[0]).to.deep.equal([{ _id: '_local/purgelog', synced_seq: 100, purged_seq: 10 }]);
        });
      });
    });
  });

  describe('replicateTo filter', () => {

    let filterFunction;

    beforeEach(() => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);
      userCtx.returns({ name: 'mobile', roles: ['district-manager'] });
      localMedicDb.info.resolves({ update_seq: -99 });
      from.returns({ on: recursiveOnFrom });
      return service.sync().then(() => {
        expect(to.callCount).to.equal(1);
        filterFunction = to.args[0][1].filter;
      });
    });

    it('does not replicate the ddoc', () => {
      const actual = filterFunction({ _id: '_design/medic-client' });
      expect(actual).to.equal(false);
    });

    it('does not replicate any ddoc - #3268', () => {
      const actual = filterFunction({ _id: '_design/sneaky-mcsneakface' });
      expect(actual).to.equal(false);
    });

    it('does not replicate the resources doc', () => {
      const actual = filterFunction({ _id: 'resources' });
      expect(actual).to.equal(false);
    });

    it('does not replicate the service-worker-meta doc', () => {
      const actual = filterFunction({ _id: 'service-worker-meta' });
      expect(actual).to.equal(false);
    });

    it('does not replicate forms', () => {
      const actual = filterFunction({ _id: '1', type: 'form' });
      expect(actual).to.equal(false);
    });

    it('does not replicate translations', () => {
      const actual = filterFunction({ _id: '1', type: 'translations' });
      expect(actual).to.equal(false);
    });

    it('does replicate reports', () => {
      const actual = filterFunction({ _id: '1', type: 'data_record' });
      expect(actual).to.equal(true);
    });

    it('does not replicate the branding doc', () => {
      const actual = filterFunction({ _id: 'branding' });
      expect(actual).to.equal(false);
    });

    it('does not replicate the partners doc', () => {
      const actual = filterFunction({ _id: 'partners' });
      expect(actual).to.equal(false);
    });
  });
});
