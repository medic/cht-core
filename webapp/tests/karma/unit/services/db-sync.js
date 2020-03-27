describe('DBSync service', () => {

  'use strict';

  const { expect } = chai;

  let service;
  let to;
  let from;
  let allDocs;
  let info;
  let isOnlineOnly;
  let userCtx;
  let sync;
  let hasAuth;
  let recursiveOnTo;
  let recursiveOnFrom;
  let $interval;
  let replicationResult;
  let getItem;
  let setItem;
  let dbSyncRetry;

  beforeEach(() => {
    replicationResult = Q.resolve;
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
    allDocs = sinon.stub();
    info = sinon.stub();
    info.returns(Q.resolve({ update_seq: 99 }));
    isOnlineOnly = sinon.stub();
    userCtx = sinon.stub();
    sync = sinon.stub();
    hasAuth = sinon.stub();
    setItem = sinon.stub();
    getItem = sinon.stub();
    dbSyncRetry = sinon.stub();

    module('inboxApp');
    module($provide => {
      $provide.factory('DB', KarmaUtils.mockDB({
        replicate: { to, from },
        allDocs: allDocs,
        sync: sync,
        info: info
      }));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('Session', {
        isOnlineOnly: isOnlineOnly,
        userCtx: userCtx
      } );
      $provide.value('Auth', { has: hasAuth });
      $provide.value('$window', { localStorage: { setItem, getItem } });
      $provide.value('DBSyncRetry', dbSyncRetry);
    });
    inject((_DBSync_, _$interval_) => {
      service = _DBSync_;
      $interval = _$interval_;
    });
  });

  afterEach(() => sinon.restore());

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

    it('syncs automatically after interval', done => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);

      service.sync().then(() => {
        expect(from.callCount).to.equal(1);
        $interval.flush(5 * 60 * 1000 + 1);
        setTimeout(() => {
          expect(from.callCount).to.equal(2);
          done();
        });
      });
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

      replicationResult = () => Q.reject('error');
      const onUpdate = sinon.stub();
      service.addUpdateListener(onUpdate);
      info.returns(Q.resolve({ update_seq: 100 }));
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

      replicationResult = () => Q.reject('error');
      const onUpdate = sinon.stub();
      service.addUpdateListener(onUpdate);

      return service.sync().then(() => {
        expect(onUpdate.callCount).to.eq(2);
        expect(onUpdate.args[0][0]).to.deep.eq({ state: 'inProgress' });
        expect(onUpdate.args[1][0]).to.deep.eq({ to: 'required', from: 'required' });
      });
    });

    it('completed replication results in "success" status', () => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);

      replicationResult = () => Q.resolve({ some: 'info' });
      const onUpdate = sinon.stub();
      service.addUpdateListener(onUpdate);

      return service.sync().then(() => {
        expect(onUpdate.callCount).to.eq(2);
        expect(onUpdate.args[0][0]).to.deep.eq({ state: 'inProgress' });
        expect(onUpdate.args[1][0]).to.deep.eq({ to: 'success', from: 'success' });
      });
    });

    it('sync scenarios based on connectivity state', done => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);

      // sync with default online status
      service.sync().then(() => {
        expect(from.callCount).to.equal(1);

        // go offline, don't attempt to sync
        service.setOnlineStatus(false);
        $interval.flush(25 * 60 * 1000 + 1);
        expect(from.callCount).to.equal(1);

        // when you come back online eventually, sync immediately
        service.setOnlineStatus(true);

        expect(from.callCount).to.equal(1);

        // wait for the inprogress sync to complete before continuing the test
        service.sync().then(() => {

          expect(from.callCount).to.equal(2);

          // don't sync if you quickly lose and regain connectivity
          service.setOnlineStatus(false);
          service.setOnlineStatus(true);
          expect(from.callCount).to.equal(2);

          // eventually, sync on the timer
          $interval.flush(5 * 60 * 1000 + 1);

          setTimeout(() => {
            expect(from.callCount).to.equal(3);
            done();
          });
        });
      });
    });

    it('does not sync to remote if user lacks "can_edit" permission', () => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(false);
      const onUpdate = sinon.stub();
      service.addUpdateListener(onUpdate);

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
      const recursiveOnTo = sinon.stub();

      const replicationResultTo = () => {
        if (count <= retries) {
          count++;
          return Q.reject({ code: 413 });
        } else {
          return Q.resolve();
        }
      };

      beforeEach(() => {
        count = 0;

        isOnlineOnly.returns(false);
        hasAuth.resolves(true);

        recursiveOnTo.callsFake(() => {
          const promise = replicationResultTo();
          promise.on = recursiveOnTo;
          return promise;
        });

        to.callsFake(() => {
          let promise;
          if (count < retries) {
            // Too big - retry
            promise = Q.reject({ code: 413 });
          } else {
            // small enough - complete
            promise = Q.resolve();
          }
          promise.on = recursiveOnTo;
          return promise;
        });
      });

      it('if request too large', () => {
        retries = 3;
        return service.sync().then(() => {
          expect(hasAuth.callCount).to.equal(1);
          expect(from.callCount).to.equal(1);
          expect(to.callCount).to.equal(3);
          expect(to.args[0][1].batch_size).to.equal(100);
          expect(to.args[1][1].batch_size).to.equal(50);
          expect(to.args[2][1].batch_size).to.equal(25);
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
  });

  describe('replicateTo filter', () => {

    let filterFunction;

    beforeEach(() => {
      isOnlineOnly.returns(false);
      hasAuth.resolves(true);
      userCtx.returns({ name: 'mobile', roles: ['district-manager'] });
      allDocs.returns(Q.resolve({ rows: [] }));
      info.returns(Q.resolve({update_seq: -99}));
      to.returns({ on: recursiveOnTo });
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
