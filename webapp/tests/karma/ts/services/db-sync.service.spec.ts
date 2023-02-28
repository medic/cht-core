import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { Store } from '@ngrx/store';

import { SessionService } from '@mm-services/session.service';
import { RulesEngineService } from '@mm-services/rules-engine.service';
import { DbSyncRetryService } from '@mm-services/db-sync-retry.service';
import { DBSyncService } from '@mm-services/db-sync.service';
import { DbService } from '@mm-services/db.service';
import { AuthService } from '@mm-services/auth.service';
import { CheckDateService } from '@mm-services/check-date.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { TranslateService } from '@mm-services/translate.service';
import { PurgeService } from '@mm-services/purge.service';
import { MigrationsService } from '@mm-services/migrations.service';

describe('DBSync service', () => {
  let service:DBSyncService;
  let to;
  let from;
  let isOnlineOnly;
  let userCtx;

  let metaTo;
  let metaToResult;
  let metaFrom;
  let metaFromResult;
  let hasAuth;
  let recursiveOnTo;
  let recursiveOnFrom;
  let replicationResultTo;
  let replicationResultFrom;
  let getItem;
  let dbSyncRetry;
  let rulesEngine;
  let checkDateService;
  let telemetryService;
  let translateService;
  let purgeService;
  let migrationService;
  let store;

  let localMedicDb;
  let localMetaDb;
  let remoteMedicDb;
  let remoteMetaDb;
  let db;

  let clock;

  const realSetTimeout = setTimeout;
  const nextTick = () => new Promise<void>(resolve => realSetTimeout(resolve));

  const expectSyncCall = (numCalls) => {
    expect(from.callCount).to.equal(numCalls);
    expect(to.callCount).to.equal(numCalls);
  };
  const expectSyncMetaCall = (numCalls) => {
    expect(db.withArgs({ meta: true }).callCount).to.equal(numCalls);
    expect(db.withArgs({ meta: true, remote: true }).callCount).to.equal(numCalls);
  };

  beforeEach(() => {
    clock = sinon.useFakeTimers();

    replicationResultTo = Promise.resolve();
    replicationResultFrom = Promise.resolve();

    to = sinon.stub();
    to.events = {};
    recursiveOnTo = sinon.stub();
    recursiveOnTo.callsFake((event, fn) => {
      to.events[event] = fn;
      const promise = replicationResultTo;
      promise.on = recursiveOnTo;
      return promise;
    });
    to.returns({ on: recursiveOnTo });
    from = sinon.stub();
    from.events = {};
    recursiveOnFrom = sinon.stub();
    recursiveOnFrom.callsFake((event, fn) => {
      from.events[event] = fn;
      const promise = replicationResultFrom;
      promise.on = recursiveOnFrom;
      return promise;
    });
    from.returns({ on: recursiveOnFrom });
    isOnlineOnly = sinon.stub();
    userCtx = sinon.stub();

    metaToResult = { docs_read: 0 };
    metaFromResult = { docs_read: 0 };
    metaTo = sinon.stub().resolves(metaToResult);
    metaFrom = sinon.stub().resolves(metaFromResult);

    hasAuth = sinon.stub();
    dbSyncRetry = sinon.stub();
    rulesEngine = { monitorExternalChanges: sinon.stub() };
    telemetryService = { record: sinon.stub().resolves() };
    translateService = { instant: sinon.stub().returnsArg(0) };
    store = { dispatch: sinon.stub() };

    localMedicDb = {
      replicate: { to: to, from: from },
      info: sinon.stub().resolves({ update_seq: 99 }),
    };
    localMetaDb = {
      replicate: { to: metaTo, from: metaFrom },
      info: sinon.stub().resolves({}),
      get: sinon.stub().resolves({}),
      put: sinon.stub(),
    };
    remoteMetaDb = {};
    remoteMedicDb = {};
    purgeService = { updateDocsToPurge: sinon.stub().resolves() };

    db = sinon.stub().returns(localMedicDb);
    db.withArgs({ remote: true }).returns(remoteMedicDb);
    db.withArgs({ meta: true }).returns(localMetaDb);
    db.withArgs({ remote: true, meta: true }).returns(remoteMetaDb);

    getItem = sinon.stub(window.localStorage, 'getItem');
    sinon.stub(window.localStorage, 'setItem');
    checkDateService = { check: sinon.stub().resolves() };
    migrationService = { runMigrations: sinon.stub().resolves() };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: { get: db } },
        { provide: SessionService, useValue: { isOnlineOnly, userCtx } },
        { provide: AuthService, useValue: { has: hasAuth } },
        { provide: DbSyncRetryService, useValue: { retryForbiddenFailure: dbSyncRetry } },
        { provide: RulesEngineService, useValue: rulesEngine },
        { provide: TelemetryService, useValue: telemetryService },
        { provide: TranslateService, useValue: translateService },
        { provide: Store, useValue: store },
        { provide: CheckDateService, useValue: checkDateService },
        { provide: PurgeService, useValue: purgeService },
        { provide: MigrationsService, useValue: migrationService },
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
        expectSyncCall(0);
        expect(checkDateService.check.callCount).to.equal(0);
      });
    });

    it('starts bi-direction replication for non-admin', () => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);

      return service.sync().then(() => {
        expect(hasAuth.callCount).to.equal(1);
        expect(hasAuth.args[0][0]).to.equal('can_edit');
        expect(migrationService.runMigrations.callCount).to.equal(1);
        expectSyncCall(1);
        expect(from.args[0][1]).to.have.keys('heartbeat', 'timeout', 'batch_size');
        expect(from.args[0][1]).to.not.have.keys('filter', 'checkpoint');
        expect(to.args[0][1]).to.have.keys('filter', 'batch_size');
        expect(to.args[0][1]).to.not.have.keys('checkpoint');
        expect(checkDateService.check.callCount).to.equal(1);
        expect(checkDateService.check.args[0]).to.deep.equal([]);
        expectSyncMetaCall(1);
        expect(purgeService.updateDocsToPurge.callCount).to.equal(1);
      });
    });

    it('should not start bi-direction replication when migrations fail', async () => {
      migrationService.runMigrations.rejects(new Error('migration failed'));

      await expect(service.sync()).to.be.rejectedWith(Error, 'migration failed');
      expectSyncCall(0);
      expect(migrationService.runMigrations.callCount).to.equal(1);
      expect(telemetryService.record.args).to.deep.equal([
        ['migrations:failure', 0],
      ]);
    });

    it('should not run migrations on subsequent syncs', async () => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);

      await service.sync();
      expectSyncCall(1);
      expect(migrationService.runMigrations.callCount).to.equal(1);
      await service.sync();
      expectSyncCall(2);
      expect(migrationService.runMigrations.callCount).to.equal(1);

      await service.sync();
      await service.sync();
      await service.sync();
      expectSyncCall(5);
      expect(migrationService.runMigrations.callCount).to.equal(1);
    });

    it('should record telemetry for bi-directional replication', async () => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);
      getItem.withArgs('medic-last-replicated-date').returns(100);
      clock.tick(500);

      metaFromResult.docs_read = 5;
      metaToResult.docs_read = 5;
      let fromResolve;
      let toResolve;
      replicationResultFrom = new Promise(resolve => fromResolve = resolve);
      replicationResultTo = new Promise(resolve => toResolve = resolve);


      const syncResult = service.sync();
      await nextTick();

      clock.tick(1000);
      fromResolve({ docs_read: 45 });
      await nextTick();

      clock.tick(500);
      toResolve({ docs_read: 63 });

      return syncResult.then(() => {
        expectSyncCall(1);
        expect(telemetryService.record.callCount).to.equal(9);
        expect(telemetryService.record.args).to.have.deep.members([
          ['migrations:success', 0],

          ['replication:medic:from:success', 1000],
          ['replication:medic:from:ms-since-last-replicated-date', 400],
          ['replication:medic:from:docs', 45],

          ['replication:medic:to:success', 1500],
          ['replication:medic:to:ms-since-last-replicated-date', 400],
          ['replication:medic:to:docs', 63],

          ['replication:meta:sync:success', 0],
          ['replication:meta:sync:docs', 10],
        ]);
      });
    });

    it('syncs automatically after interval', async () => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);

      await service.sync();
      expectSyncCall(1);
      expect(migrationService.runMigrations.callCount).to.equal(1);
      clock.tick(5 * 60 * 1000 + 1);
      await nextTick();
      expectSyncCall(2);
      expect(migrationService.runMigrations.callCount).to.equal(1);
    });

    it('does not attempt sync while offline', () => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);

      service.setOnlineStatus(false);
      return service.sync().then(() => {
        expectSyncCall(0);
        expect(checkDateService.check.callCount).to.equal(0);
      });
    });

    it('multiple calls to sync yield one attempt', () => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);

      service.sync();
      return service.sync().then(() => {
        expectSyncCall(1);
      });
    });

    it('force sync while offline still syncs', () => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);

      service.setOnlineStatus(false);
      return service.sync(true).then(() => {
        expectSyncCall(1);
        expect(checkDateService.check.callCount).to.equal(1);
      });
    });

    it('error in replication with no docs to send results in "unknown" status', () => {
      const consoleErrorMock = sinon.stub(console, 'error');
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);

      replicationResultTo = replicationResultFrom = Promise.reject('error');
      const onUpdate = sinon.stub();
      service.subscribe(onUpdate);
      localMedicDb.info.resolves({ update_seq: 100 });
      getItem.returns('100');

      return service.sync().then(() => {
        expect(onUpdate.callCount).to.eq(2);
        expect(onUpdate.args[0][0]).to.deep.eq({ state: 'inProgress' });
        expect(onUpdate.args[1][0]).to.deep.eq({ state: 'unknown' });
        expect(consoleErrorMock.callCount).to.equal(2);
        expect(consoleErrorMock.args[0][0]).to.equal('Error replicating to remote server');
        expect(consoleErrorMock.args[1][0]).to.equal('Error replicating from remote server');
      });
    });

    it('error in replication results in "required" status', () => {
      const consoleErrorMock = sinon.stub(console, 'error');
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);

      replicationResultTo = replicationResultFrom = Promise.reject('error');
      const onUpdate = sinon.stub();
      service.subscribe(onUpdate);

      return service.sync().then(() => {
        expect(onUpdate.callCount).to.eq(2);
        expect(onUpdate.args[0][0]).to.deep.eq({ state: 'inProgress' });
        expect(onUpdate.args[1][0]).to.deep.eq({ to: 'required', from: 'required' });
        expect(consoleErrorMock.callCount).to.equal(2);
        expect(consoleErrorMock.args[0][0]).to.equal('Error replicating to remote server');
        expect(consoleErrorMock.args[1][0]).to.equal('Error replicating from remote server');
      });
    });

    it('completed replication results in "success" status', () => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);

      replicationResultFrom = Promise.resolve({ some: 'info' });
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
      expectSyncCall(1);
      // go offline, don't attempt to sync
      service.setOnlineStatus(false);
      clock.tick(25 * 60 * 1000 + 1);
      await nextTick();
      expectSyncCall(1);

      // when you come back online eventually, sync immediately
      service.setOnlineStatus(true);
      expectSyncCall(1);

      // wait for the inprogress sync to complete before continuing the test
      await service.sync();
      expectSyncCall(2);

      // don't sync if you quickly lose and regain connectivity
      service.setOnlineStatus(false);
      service.setOnlineStatus(true);
      expectSyncCall(2);

      // eventually, sync on the timer
      clock.tick(5 * 60 * 1000 + 1);
      await nextTick();

      expectSyncCall(3);
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

    describe('telemetry when replication fails', () => {
      it('when from fails and maybe server is offline', async () => {
        isOnlineOnly.returns(false);
        hasAuth.resolves(true);
        getItem.withArgs('medic-last-replicated-date').returns(200);
        clock.tick(1000);

        let fromReject;
        let toResolve;
        replicationResultFrom = new Promise((resolve, reject) => fromReject = reject);
        replicationResultTo = new Promise(resolve => toResolve = resolve);
        metaFromResult.docs_read = 13;
        metaToResult.docs_read = 12;

        const syncResult = service.sync();
        await nextTick();

        clock.tick(2000);
        const error = { message: 'Failed to fetch', result: { docs_read: 22 } };
        fromReject(error);
        from.events.error(error);
        await nextTick();

        clock.tick(1000);
        toResolve({ docs_read: 32 });

        return syncResult.then(() => {
          expectSyncCall(1);
          expect(telemetryService.record.callCount).to.equal(10);
          expect(telemetryService.record.args).to.have.deep.members([
            ['migrations:success', 0],

            ['replication:medic:from:failure', 2000],
            ['replication:medic:from:ms-since-last-replicated-date', 800],
            ['replication:medic:from:docs', 22],
            ['replication:medic:from:failure:reason:offline:server'],

            ['replication:medic:to:success', 3000],
            ['replication:medic:to:ms-since-last-replicated-date', 800],
            ['replication:medic:to:docs', 32],

            ['replication:meta:sync:success', 0],
            ['replication:meta:sync:docs', 25],
          ]);
        });
      });

      it('when from fails and maybe server is offline and returns 502 and HTML', async () => {
        isOnlineOnly.returns(false);
        hasAuth.resolves(true);
        getItem.withArgs('medic-last-replicated-date').returns(200);
        clock.tick(1000);

        let fromReject;
        let toResolve;
        replicationResultFrom = new Promise((resolve, reject) => fromReject = reject);
        replicationResultTo = new Promise(resolve => toResolve = resolve);
        metaFromResult.docs_read = 10;
        metaToResult.docs_read = 10;

        const syncResult = service.sync();
        await nextTick();

        clock.tick(2000);
        const error = { message: 'Unexpected token S in JSON at position 0', result: { docs_read: 22 } };
        fromReject(error);
        from.events.error(error);
        await nextTick();

        clock.tick(1000);
        toResolve({ docs_read: 32 });

        return syncResult.then(() => {
          expectSyncCall(1);

          expect(telemetryService.record.callCount).to.equal(10);
          expect(telemetryService.record.args).to.have.deep.members([
            ['migrations:success', 0],

            ['replication:medic:from:failure', 2000],
            ['replication:medic:from:ms-since-last-replicated-date', 800],
            ['replication:medic:from:docs', 22],
            ['replication:medic:from:failure:reason:offline:server'],

            ['replication:medic:to:success', 3000],
            ['replication:medic:to:ms-since-last-replicated-date', 800],
            ['replication:medic:to:docs', 32],

            ['replication:meta:sync:success', 0],
            ['replication:meta:sync:docs', 20],
          ]);
        });
      });

      it('when from fails and client is offline', async () => {
        isOnlineOnly.returns(false);
        hasAuth.resolves(true);
        getItem.withArgs('medic-last-replicated-date').returns(300);
        clock.tick(1000);
        service.setOnlineStatus(false);

        let fromReject;
        let toResolve;
        replicationResultFrom = new Promise((resolve, reject) => fromReject = reject);
        replicationResultTo = new Promise(resolve => toResolve = resolve);
        metaFromResult.docs_read = 0;
        metaToResult.docs_read = 0;

        const syncResult = service.sync(true);
        await nextTick();

        clock.tick(500);
        const error = { message: 'Failed to fetch', result: { docs_read: 12 } };
        fromReject(error);
        from.events.error(error);
        await nextTick();

        clock.tick(500);
        toResolve({ docs_read: 67 });

        return syncResult.then(() => {
          expectSyncCall(1);
          expect(telemetryService.record.callCount).to.equal(11);
          expect(telemetryService.record.args).to.have.deep.members([
            ['migrations:success', 0],

            ['replication:user-initiated'],

            ['replication:medic:from:failure', 500],
            ['replication:medic:from:ms-since-last-replicated-date', 700],
            ['replication:medic:from:docs', 12],
            ['replication:medic:from:failure:reason:offline:client'],

            ['replication:medic:to:success', 1000],
            ['replication:medic:to:ms-since-last-replicated-date', 700],
            ['replication:medic:to:docs', 67],

            ['replication:meta:sync:success', 0],
            ['replication:meta:sync:docs', 0],
          ]);
        });
      });

      it('when from fails from another error', async () => {
        isOnlineOnly.returns(false);
        hasAuth.resolves(true);
        getItem.withArgs('medic-last-replicated-date').returns(300);
        clock.tick(1000);

        let fromReject;
        let toResolve;
        replicationResultFrom = new Promise((resolve, reject) => fromReject = reject);
        replicationResultTo = new Promise(resolve => toResolve = resolve);

        const syncResult = service.sync();
        await nextTick();

        clock.tick(500);
        const error = { message: 'BOOM', result: { docs_read: 12 } };
        fromReject(error);
        from.events.error(error);
        await nextTick();

        clock.tick(500);
        toResolve({ docs_read: 67 });

        return syncResult.then(() => {
          expectSyncCall(1);
          expect(telemetryService.record.callCount).to.equal(10);
          expect(telemetryService.record.args).to.have.deep.members([
            ['migrations:success', 0],

            ['replication:medic:from:failure', 500],
            ['replication:medic:from:ms-since-last-replicated-date', 700],
            ['replication:medic:from:docs', 12],
            ['replication:medic:from:failure:reason:error'],

            ['replication:medic:to:success', 1000],
            ['replication:medic:to:ms-since-last-replicated-date', 700],
            ['replication:medic:to:docs', 67],

            ['replication:meta:sync:success', 0],
            ['replication:meta:sync:docs', 0],
          ]);
        });
      });

      it('when to fails and maybe server is offline', async () => {
        isOnlineOnly.returns(false);
        hasAuth.resolves(true);
        getItem.withArgs('medic-last-replicated-date').returns(200);
        clock.tick(1000);

        let fromResolve;
        let toReject;
        replicationResultFrom = new Promise(resolve => fromResolve = resolve);
        replicationResultTo = new Promise((resolve, reject) => toReject = reject);

        const syncResult = service.sync();
        await nextTick();

        clock.tick(2000);
        const error = { message: 'Failed to fetch', result: { docs_read: 22 } };
        toReject(error);
        to.events.error(error);
        await nextTick();

        clock.tick(1000);
        fromResolve({ docs_read: 32 });

        return syncResult.then(() => {
          expectSyncCall(1);
          expect(telemetryService.record.callCount).to.equal(10);
          expect(telemetryService.record.args).to.have.deep.members([
            ['migrations:success', 0],

            ['replication:medic:from:success', 3000],
            ['replication:medic:from:ms-since-last-replicated-date', 800],
            ['replication:medic:from:docs', 32],

            ['replication:medic:to:failure', 2000],
            ['replication:medic:to:ms-since-last-replicated-date', 800],
            ['replication:medic:to:docs', 22],
            ['replication:medic:to:failure:reason:offline:server'],

            ['replication:meta:sync:success', 0],
            ['replication:meta:sync:docs', 0],
          ]);
        });
      });

      it('when to fails and client is offline', async () => {
        isOnlineOnly.returns(false);
        hasAuth.resolves(true);
        getItem.withArgs('medic-last-replicated-date').returns(200);
        service.setOnlineStatus(false);
        clock.tick(300);

        let fromResolve;
        let toReject;
        replicationResultFrom = new Promise(resolve => fromResolve = resolve);
        replicationResultTo = new Promise((resolve, reject) => toReject = reject);

        const syncResult = service.sync(true);
        await nextTick();

        clock.tick(1000);
        const error = { message: 'Failed to fetch', result: { docs_read: 12 } };
        toReject(error);
        to.events.error(error);
        await nextTick();

        clock.tick(7000);
        fromResolve({ docs_read: 500 });

        return syncResult.then(() => {
          expectSyncCall(1);
          expect(telemetryService.record.callCount).to.equal(11);
          expect(telemetryService.record.args).to.have.deep.members([
            ['migrations:success', 0],

            ['replication:user-initiated'],

            ['replication:medic:from:success', 8000],
            ['replication:medic:from:ms-since-last-replicated-date', 100],
            ['replication:medic:from:docs', 500],

            ['replication:medic:to:failure', 1000],
            ['replication:medic:to:ms-since-last-replicated-date', 100],
            ['replication:medic:to:docs', 12],
            ['replication:medic:to:failure:reason:offline:client'],

            ['replication:meta:sync:success', 0],
            ['replication:meta:sync:docs', 0],
          ]);
        });
      });

      it('when to fails from other error', async () => {
        isOnlineOnly.returns(false);
        hasAuth.resolves(true);
        getItem.withArgs('medic-last-replicated-date').returns(200);
        clock.tick(300);

        let fromResolve;
        let toReject;
        replicationResultFrom = new Promise(resolve => fromResolve = resolve);
        replicationResultTo = new Promise((resolve, reject) => toReject = reject);

        const syncResult = service.sync(true);
        await nextTick();

        clock.tick(700);
        const error = { message: 'Not failed to fetch', result: { docs_read: 6 } };
        toReject(error);
        to.events.error(error);
        fromResolve({ docs_read: 400 });

        return syncResult.then(() => {
          expectSyncCall(1);
          expect(telemetryService.record.callCount).to.equal(11);
          expect(telemetryService.record.args).to.have.deep.members([
            ['migrations:success', 0],

            ['replication:user-initiated'],

            ['replication:medic:from:success', 700],
            ['replication:medic:from:ms-since-last-replicated-date', 100],
            ['replication:medic:from:docs', 400],

            ['replication:medic:to:failure', 700],
            ['replication:medic:to:ms-since-last-replicated-date', 100],
            ['replication:medic:to:docs', 6],
            ['replication:medic:to:failure:reason:error'],

            ['replication:meta:sync:success', 0],
            ['replication:meta:sync:docs', 0],
          ]);
        });
      });

      it('when both fail', async () => {
        isOnlineOnly.returns(false);
        hasAuth.resolves(true);
        getItem.withArgs('medic-last-replicated-date').returns(200);
        clock.tick(300);

        let fromReject;
        let toReject;
        replicationResultFrom = new Promise((resolve, reject) => fromReject = reject);
        replicationResultTo = new Promise((resolve, reject) => toReject = reject);

        const syncResult = service.sync(true);
        await nextTick();

        clock.tick(100);
        const errorTo = { message: 'Not failed to fetch', result: { docs_read: 6 } };
        toReject(errorTo);
        to.events.error(errorTo);
        await nextTick();

        clock.tick(100);
        const errorFrom = { message: 'Not failed to fetch', result: { docs_read: 12 } };
        fromReject(errorFrom);
        from.events.error(errorFrom);

        return syncResult.then(() => {
          expectSyncCall(1);
          expect(telemetryService.record.callCount).to.equal(12);
          expect(telemetryService.record.args).to.have.deep.members([
            ['migrations:success', 0],

            ['replication:user-initiated'],

            ['replication:medic:to:failure', 100],
            ['replication:medic:to:ms-since-last-replicated-date', 100],
            ['replication:medic:to:docs', 6],
            ['replication:medic:to:failure:reason:error'],

            ['replication:medic:from:failure', 200],
            ['replication:medic:from:ms-since-last-replicated-date', 100],
            ['replication:medic:from:docs', 12],
            ['replication:medic:from:failure:reason:error'],

            ['replication:meta:sync:success', 0],
            ['replication:meta:sync:docs', 0],
          ]);
        });
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
        const consoleWarnMock = sinon.stub(console, 'warn');
        retries = 3;
        return service.sync().then(() => {
          expect(hasAuth.callCount).to.equal(1);
          expect(from.callCount).to.equal(1);
          expect(to.callCount).to.equal(4);
          expect(consoleWarnMock.callCount).to.equal(3);
          expect(to.args[0][1].batch_size).to.equal(100);
          expect(to.args[1][1].batch_size).to.equal(50);
          expect(consoleWarnMock.args[0][0].endsWith('Trying again with batch size of 50')).to.be.true;
          expect(to.args[2][1].batch_size).to.equal(25);
          expect(consoleWarnMock.args[1][0].endsWith('Trying again with batch size of 25')).to.be.true;
          expect(to.args[3][1].batch_size).to.equal(12);
          expect(consoleWarnMock.args[2][0].endsWith('Trying again with batch size of 12')).to.be.true;
        });
      });

      it('gives up once batch size is 1', () => {
        const consoleErrorMock = sinon.stub(console, 'error');
        const consoleWarnMock = sinon.stub(console, 'warn');
        retries = 100; // should not get this far...
        return service.sync().then(() => {
          expect(from.callCount).to.equal(1);
          expect(to.callCount).to.equal(7);
          expect(consoleWarnMock.callCount).to.equal(6);
          expect(to.args[0][1].batch_size).to.equal(100);
          expect(to.args[1][1].batch_size).to.equal(50);
          expect(consoleWarnMock.args[0][0].endsWith('Trying again with batch size of 50')).to.be.true;
          expect(to.args[2][1].batch_size).to.equal(25);
          expect(consoleWarnMock.args[1][0].endsWith('Trying again with batch size of 25')).to.be.true;
          expect(to.args[3][1].batch_size).to.equal(12);
          expect(consoleWarnMock.args[2][0].endsWith('Trying again with batch size of 12')).to.be.true;
          expect(to.args[4][1].batch_size).to.equal(6);
          expect(consoleWarnMock.args[3][0].endsWith('Trying again with batch size of 6')).to.be.true;
          expect(to.args[5][1].batch_size).to.equal(3);
          expect(consoleWarnMock.args[4][0].endsWith('Trying again with batch size of 3')).to.be.true;
          expect(to.args[6][1].batch_size).to.equal(1);
          expect(consoleWarnMock.args[5][0].endsWith('Trying again with batch size of 1')).to.be.true;
          expect(consoleErrorMock.callCount).to.equal(1);
          expect(consoleErrorMock.args[0][0]).to.equal('Error replicating to remote server');
        });
      });

    });

    describe('give user feedback when manually syncing', () => {
      it('doesn\'t give feedback when sync happens automatically in the background', async () => {
        isOnlineOnly.returns(false);
        hasAuth.resolves(true);

        await service.sync();
        expectSyncCall(1);
        expect(store.dispatch.callCount).to.equal(0);
      });

      it('displays a snackbar when the sync begins and when it succeeds', async () => {
        isOnlineOnly.returns(false);
        hasAuth.resolves(true);

        await service.sync(true);
        expectSyncCall(1);
        expect(store.dispatch.callCount).to.equal(2);
        expect(store.dispatch.args[0][0].type).to.equal('SET_SNACKBAR_CONTENT');
        expect(store.dispatch.args[0][0].payload.message).to.equal('sync.status.in_progress');
        expect(store.dispatch.args[1][0].type).to.equal('SET_SNACKBAR_CONTENT');
        expect(store.dispatch.args[1][0].payload.message).to.equal('sync.status.not_required');
      });

      it('displays a snackbar when the sync fails', async () => {
        isOnlineOnly.returns(false);
        hasAuth.resolves(true);

        replicationResultTo = replicationResultFrom = Promise.reject('error');
        await service.sync(true);
        expectSyncCall(1);
        expect(store.dispatch.callCount).to.equal(2);
        expect(store.dispatch.args[0][0].type).to.equal('SET_SNACKBAR_CONTENT');
        expect(store.dispatch.args[0][0].payload.message).to.equal('sync.status.in_progress');
        expect(store.dispatch.args[1][0].type).to.equal('SET_SNACKBAR_CONTENT');
        expect(store.dispatch.args[1][0].payload.message).to.equal('sync.feedback.failure.unknown');
      });

      it('allows retrying from the snackbar when the sync fails', async () => {
        isOnlineOnly.returns(false);
        hasAuth.resolves(true);

        replicationResultTo = replicationResultFrom = Promise.reject('error');
        await service.sync(true);
        expectSyncCall(1);
        expect(store.dispatch.callCount).to.equal(2);
        expect(store.dispatch.args[0][0].type).to.equal('SET_SNACKBAR_CONTENT');
        expect(store.dispatch.args[0][0].payload.message).to.equal('sync.status.in_progress');
        expect(store.dispatch.args[1][0].type).to.equal('SET_SNACKBAR_CONTENT');
        expect(store.dispatch.args[1][0].payload.message).to.equal('sync.feedback.failure.unknown');

        replicationResultTo = replicationResultFrom = Promise.resolve();
        await store.dispatch.args[1][0].payload.action.onClick();
        expectSyncCall(2);
        expect(store.dispatch.callCount).to.equal(4);
        expect(store.dispatch.args[2][0].type).to.equal('SET_SNACKBAR_CONTENT');
        expect(store.dispatch.args[2][0].payload.message).to.equal('sync.status.in_progress');
        expect(store.dispatch.args[3][0].type).to.equal('SET_SNACKBAR_CONTENT');
        expect(store.dispatch.args[3][0].payload.message).to.equal('sync.status.not_required');
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
      const onUpdate = sinon.stub();
      service.subscribe(onUpdate);
      const consoleErrorMock = sinon.stub(console, 'error');
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);
      return service.sync().then(() => {
        from.events.denied();
        expect(dbSyncRetry.callCount).to.equal(0);
        expect(consoleErrorMock.callCount).to.equal(1);
        expect(consoleErrorMock.args[0][0]).to.equal('Denied replicating from remote server');
        expect(telemetryService.record.args).to.include.deep.members([['replication:medic:from:denied']]);
        expect(telemetryService.record.args).to.not.include.deep.members([['replication:medic:to:denied']]);
        expect(onUpdate.callCount).to.eq(2);
        expect(onUpdate.args[0][0]).to.deep.eq({ state: 'inProgress' });
        expect(onUpdate.args[1][0]).to.deep.eq({ from: 'success', to: 'success' });
      });
    });

    it('"denied" to handle calls DBSyncRetry', () => {
      const consoleErrorMock = sinon.stub(console, 'error');
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);
      return service.sync().then(() => {
        to.events.denied({ some: 'err' });
        expect(dbSyncRetry.callCount).to.equal(1);
        expect(dbSyncRetry.args[0]).to.deep.equal([{ some: 'err' }]);
        expectSyncCall(1);
        expect(consoleErrorMock.callCount).to.equal(1);
        expect(consoleErrorMock.args[0][0]).to.equal('Denied replicating to remote server');
        expect(telemetryService.record.args).to.not.include.deep.members([['replication:medic:from:denied']]);
        expect(telemetryService.record.args).to.include.deep.members([['replication:medic:to:denied']]);
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
        expectSyncCall(1);
      });
    });

    describe('replicate meta', () => {
      beforeEach(() => {
        hasAuth.resolves(true);
        isOnlineOnly.returns(false);
      });

      it('should sync meta dbs with no filter', () => {
        return service.sync().then(() => {
          expectSyncMetaCall(1);
          expect(localMetaDb.replicate.from.callCount).to.equal(1);
          expect(localMetaDb.replicate.from.args[0]).to.deep.equal([remoteMetaDb]);
          expect(localMetaDb.replicate.to.callCount).to.equal(1);
          expect(localMetaDb.replicate.to.args[0]).to.deep.equal([remoteMetaDb]);
        });
      });

      it('should sync meta dbs only once if sync is called twice', async () => {
        await service.sync();
        expectSyncMetaCall(1);
        expect(localMetaDb.replicate.from.callCount).to.equal(1);
        expect(localMetaDb.replicate.from.args[0]).to.deep.equal([remoteMetaDb]);
        expect(localMetaDb.replicate.to.callCount).to.equal(1);
        expect(localMetaDb.replicate.to.args[0]).to.deep.equal([remoteMetaDb]);

        await service.sync();
        expectSyncMetaCall(1);
        expect(localMetaDb.replicate.from.callCount).to.equal(1);
      });

      it('should sync meta dbs twice if sync is called twice with force flag', async () => {
        await service.sync();
        expectSyncMetaCall(1);
        await service.sync(true);
        expectSyncMetaCall(2);
        expect(localMetaDb.replicate.from.callCount).to.equal(2);
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

      it('should record telemetry when successful', async () => {
        let metaToResolve;
        let metaFromResolve;
        metaTo.callsFake(() => new Promise(resolve => metaToResolve = resolve));
        metaFrom.callsFake(() => new Promise(resolve => metaFromResolve = resolve));

        const syncCall = service.sync();
        await nextTick();
        clock.tick(1000);
        await nextTick();

        metaToResolve({ docs_read: 100 });
        metaFromResolve({ docs_read: 32 });

        await nextTick();
        await syncCall;

        expect(telemetryService.record.args).to.have.deep.members([
          ['migrations:success', 0],

          ['replication:meta:sync:success', 1000],
          ['replication:meta:sync:docs', 132],

          ['replication:medic:to:success', 0],
          ['replication:medic:from:success', 0],
        ]);
      });

      it('should record telemetry when failed because "server" was offline', async () => {
        let metaToReject;
        let metaFromResolve;
        metaTo.returns(new Promise((resolve, reject) => metaToReject = reject));
        metaFrom.returns(new Promise(resolve => metaFromResolve = resolve));

        const syncCall = service.sync();
        await nextTick();
        clock.tick(1000);
        await nextTick();

        metaToReject({ message: 'Failed to fetch', result: { docs_read: 0 } });
        metaFromResolve({ docs_read: 100 });

        await nextTick();
        await syncCall;

        expect(telemetryService.record.args).to.have.deep.members([
          ['migrations:success', 0],

          ['replication:meta:sync:failure', 1000],
          ['replication:meta:sync:docs', 0],
          ['replication:meta:sync:failure:reason:offline:server'],

          ['replication:medic:to:success', 0],
          ['replication:medic:from:success', 0],
        ]);
      });

      it('should record telemetry when failed because "client" was offline', async () => {
        let metaToResolve;
        let metaFromReject;
        metaTo.returns(new Promise(resolve => metaToResolve = resolve));
        metaFrom.returns(new Promise((resolve, reject) => metaFromReject = reject));
        service.setOnlineStatus(false);

        const syncCall = service.sync(true);
        await nextTick();
        clock.tick(1312321);
        await nextTick();

        metaToResolve({ docs_read: 200 });
        metaFromReject({ message: 'Failed to fetch', result: { docs_read: 13 } });

        await nextTick();
        await syncCall;

        expect(telemetryService.record.args).to.have.deep.members([
          ['migrations:success', 0],

          ['replication:user-initiated'],
          ['replication:medic:to:success', 0],
          ['replication:medic:from:success', 0],

          ['replication:meta:sync:failure', 1312321],
          ['replication:meta:sync:docs', 13],
          ['replication:meta:sync:failure:reason:offline:client'],
        ]);
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
