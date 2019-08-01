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
  let Auth;
  let recursiveOn;
  let $interval;
  let replicationResult;
  let getItem;
  let setItem;
  let http;
  let POUCHDB_OPTIONS;
  let bulkDocs;

  beforeEach(() => {
    replicationResult = Q.resolve;
    recursiveOn = sinon.stub();
    recursiveOn.callsFake(() => {
      const promise = replicationResult();
      promise.on = recursiveOn;
      return promise;
    });
    to = sinon.stub();
    to.returns({ on: recursiveOn });
    from = sinon.stub();
    from.returns({ on: recursiveOn });
    allDocs = sinon.stub();
    info = sinon.stub();
    info.returns(Q.resolve({ update_seq: 99 }));
    isOnlineOnly = sinon.stub();
    userCtx = sinon.stub();
    sync = sinon.stub();
    Auth = sinon.stub();
    setItem = sinon.stub();
    getItem = sinon.stub();
    http = { get: sinon.stub() };
    POUCHDB_OPTIONS = {
      remote_headers: { 'medic-replication-id': 'some-random-uuid', some: 'thing' },
      local: {}
    };
    bulkDocs = sinon.stub();

    module('inboxApp');
    module($provide => {
      $provide.factory('DB', KarmaUtils.mockDB({
        replicate: { to, from },
        allDocs: allDocs,
        sync: sync,
        info: info,
        bulkDocs: bulkDocs
      }));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('Session', {
        isOnlineOnly: isOnlineOnly,
        userCtx: userCtx
      } );
      $provide.value('Auth', Auth);
      $provide.value('$window', { localStorage: { setItem, getItem } });
      $provide.value('$http', http);
      $provide.constant('POUCHDB_OPTIONS', POUCHDB_OPTIONS);
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
      Auth.returns(Q.resolve());

      return service.sync().then(() => {
        expect(Auth.callCount).to.equal(1);
        expect(Auth.args[0][0]).to.equal('can_edit');
        expect(from.callCount).to.equal(1);
        expect(from.args[0][1]).to.not.have.keys('filter', 'checkpoint');
        expect(to.callCount).to.equal(1);
        expect(to.args[0][1]).to.have.keys('filter', 'checkpoint');
      });
    });

    it('syncs automatically after interval', done => {
      isOnlineOnly.returns(false);
      Auth.returns(Q.resolve());

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
      Auth.returns(Q.resolve());

      service.setOnlineStatus(false);
      return service.sync().then(() => {
        expect(from.callCount).to.equal(0);
      });
    });

    it('multiple calls to sync yield one attempt', () => {
      isOnlineOnly.returns(false);
      Auth.returns(Q.resolve());

      service.sync();
      return service.sync().then(() => {
        expect(from.callCount).to.equal(1);
      });
    });

    it('force sync while offline still syncs', () => {
      isOnlineOnly.returns(false);
      Auth.returns(Q.resolve());

      service.setOnlineStatus(false);
      return service.sync(true).then(() => {
        expect(from.callCount).to.equal(1);
      });
    });

    it('error in replication with no docs to send results in "unknown" status', () => {
      isOnlineOnly.returns(false);
      Auth.returns(Q.resolve());

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
      Auth.returns(Q.resolve());

      replicationResult = () => Q.reject('error');
      const onUpdate = sinon.stub();
      service.addUpdateListener(onUpdate);

      return service.sync().then(() => {
        expect(onUpdate.callCount).to.eq(2);
        expect(onUpdate.args[0][0]).to.deep.eq({ state: 'inProgress' });
        expect(onUpdate.args[1][0]).to.deep.eq({ to: 'required', from: 'required' });
        expect(http.get.callCount).to.equal(0);
      });
    });

    it('completed replication results in "success" status', () => {
      isOnlineOnly.returns(false);
      Auth.returns(Q.resolve());
      http.get
        .withArgs('/api/v1/server-side-purge/changes')
        .resolves({ data: { purged_ids: [], last_seq: '123-123' } });

      replicationResult = () => Q.resolve({ some: 'info' });
      const onUpdate = sinon.stub();
      service.addUpdateListener(onUpdate);

      return service.sync().then(() => {
        expect(onUpdate.callCount).to.eq(2);
        expect(onUpdate.args[0][0]).to.deep.eq({ state: 'inProgress' });
        expect(onUpdate.args[1][0]).to.deep.eq({ to: 'success', from: 'success' });
        expect(http.get.callCount).to.equal(1);
        console.log(http.get.args[0][1]);
        console.log(service.opts());
        expect(http.get.args[0]).to.deep.equal(['/api/v1/server-side-purge/changes', { headers: POUCHDB_OPTIONS.remote_headers }]);
      });
    });

    it('sync scenarios based on connectivity state', done => {
      isOnlineOnly.returns(false);
      Auth.returns(Q.resolve());

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
      Auth.returns(Q.reject('unauthorized'));
      http.get
        .withArgs('/api/v1/server-side-purge/changes')
        .resolves({ data: { purged_ids: [], last_seq: '123-123' } });

      const onUpdate = sinon.stub();
      service.addUpdateListener(onUpdate);

      return service.sync().then(() => {
        expect(Auth.callCount).to.equal(1);
        expect(Auth.args[0][0]).to.equal('can_edit');
        expect(from.callCount).to.equal(1);
        expect(from.args[0][1]).to.not.have.keys('filter', 'checkpoint');
        expect(to.callCount).to.equal(0);

        expect(onUpdate.callCount).to.eq(2);
        expect(onUpdate.args[0][0]).to.deep.eq({ state: 'inProgress' });
        expect(onUpdate.args[1][0]).to.deep.eq({ to: 'success', from: 'success' });
      });
    });
  });

  describe('replicateTo filter', () => {

    let filterFunction;

    before(() => {
      isOnlineOnly.returns(false);
      Auth.returns(Q.resolve());
      userCtx.returns({ name: 'mobile', roles: ['district-manager'] });
      allDocs.returns(Q.resolve({ rows: [] }));
      info.returns(Q.resolve({update_seq: -99}));
      to.returns({ on: recursiveOn });
      from.returns({ on: recursiveOn });
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

  describe('server side purge', () => {
    beforeEach(() => {
      isOnlineOnly.returns(false);
      Auth.returns(Q.resolve());
    });

    it('should request purge ids after successfull downwards replication', () => {
      http.get
        .withArgs('/api/v1/server-side-purge/changes')
        .resolves({ data: { purged_ids: [], last_seq: '111-111' }});

      return service.sync().then(() => {
        chai.expect(http.get.callCount).to.equal(1);
        chai.expect(http.get.args[0]).to.deep.equal(['/api/v1/server-side-purge/changes', { headers: POUCHDB_OPTIONS.remote_headers }]);
      });
    });

    it('should "purge" all returned ids', () => {
      const purgeChanges = http.get.withArgs('/api/v1/server-side-purge/changes');
      const purgeCheckpoint = http.get.withArgs('/api/v1/server-side-purge/checkpoint');

      purgeChanges
        .onCall(0).resolves({ data: { purged_ids: ['id1', 'id2', 'id3'], last_seq: '111-222' }})
        .onCall(1).resolves({ data: { purged_ids: [], last_seq: '111-222' }});

      purgeCheckpoint.withArgs('/api/v1/server-side-purge/checkpoint').resolves();

      allDocs
        .withArgs({ keys: ['id1', 'id2', 'id3'] })
        .resolves({ rows: [
            { id: 'id1', key: 'id1', value: { rev: '11-abc' } },
            { id: 'id2', key: 'id2', value: { rev: '12-abc' } },
            { id: 'id3', key: 'id3', value: { rev: '13-abc' } },
          ]});

      bulkDocs.resolves([]);

      return service.sync().then(() => {
        chai.expect(purgeChanges.callCount).to.equal(2);
        chai.expect(purgeChanges.args[0][1]).to.deep.equal({ headers: POUCHDB_OPTIONS.remote_headers });
        chai.expect(purgeChanges.args[1][1]).to.deep.equal({ headers: POUCHDB_OPTIONS.remote_headers });
        chai.expect(allDocs.callCount).to.equal(1);
        chai.expect(allDocs.args[0]).to.deep.equal([{ keys: ['id1', 'id2', 'id3'] }]);
        chai.expect(bulkDocs.callCount).to.equal(1);
        chai.expect(bulkDocs.args[0]).to.deep.equal([[
          { _id: 'id1', _rev: '11-abc', _deleted: true, purged: true },
          { _id: 'id2', _rev: '12-abc', _deleted: true, purged: true },
          { _id: 'id3', _rev: '13-abc', _deleted: true, purged: true },
        ]]);
        chai.expect(purgeCheckpoint.callCount).to.equal(1);
        chai.expect(purgeCheckpoint.args[0][1]).to.deep.equal({ params: { seq: '111-222' }, headers: POUCHDB_OPTIONS.remote_headers });
      });
    });

    it('should keep requesting purged ids untill no results are returned', () => {
      const purgeChanges = http.get.withArgs('/api/v1/server-side-purge/changes');
      const purgeCheckpoint = http.get.withArgs('/api/v1/server-side-purge/checkpoint');

      purgeChanges
        .onCall(0).resolves({ data: { purged_ids: ['id1', 'id2', 'id3'], last_seq: '111-222' }})
        .onCall(1).resolves({ data: { purged_ids: ['id4', 'id5', 'id6'], last_seq: '121-222' }})
        .onCall(2).resolves({ data: { purged_ids: ['id7', 'id8', 'id9'], last_seq: '131-222' }})
        .onCall(3).resolves({ data: { purged_ids: [], last_seq: '131-222' }});

      purgeCheckpoint.withArgs('/api/v1/server-side-purge/checkpoint').resolves();

      const allDocsMock = ({ keys }) => Promise.resolve({ rows: keys.map(id => ({ id, key: id, value: { rev: `${id}-rev` } })) });
      allDocs.callsFake(allDocsMock);
      bulkDocs.resolves([]);

      return service.sync().then(() => {
        chai.expect(purgeChanges.callCount).to.equal(4);

        chai.expect(allDocs.callCount).to.equal(3);
        chai.expect(allDocs.args[0]).to.deep.equal([{ keys: ['id1', 'id2', 'id3'] }]);
        chai.expect(allDocs.args[1]).to.deep.equal([{ keys: ['id4', 'id5', 'id6'] }]);
        chai.expect(allDocs.args[2]).to.deep.equal([{ keys: ['id7', 'id8', 'id9'] }]);

        chai.expect(bulkDocs.callCount).to.equal(3);
        chai.expect(bulkDocs.args[0]).to.deep.equal([[
          { _id: 'id1', _rev: 'id1-rev', _deleted: true, purged: true },
          { _id: 'id2', _rev: 'id2-rev', _deleted: true, purged: true },
          { _id: 'id3', _rev: 'id3-rev', _deleted: true, purged: true },
        ]]);
        chai.expect(bulkDocs.args[1]).to.deep.equal([[
          { _id: 'id4', _rev: 'id4-rev', _deleted: true, purged: true },
          { _id: 'id5', _rev: 'id5-rev', _deleted: true, purged: true },
          { _id: 'id6', _rev: 'id6-rev', _deleted: true, purged: true },
        ]]);
        chai.expect(bulkDocs.args[2]).to.deep.equal([[
          { _id: 'id7', _rev: 'id7-rev', _deleted: true, purged: true },
          { _id: 'id8', _rev: 'id8-rev', _deleted: true, purged: true },
          { _id: 'id9', _rev: 'id9-rev', _deleted: true, purged: true },
        ]]);

        chai.expect(purgeCheckpoint.callCount).to.equal(3);
        chai.expect(purgeCheckpoint.args[0][1]).to.deep.equal({ params: { seq: '111-222' }, headers: POUCHDB_OPTIONS.remote_headers });
        chai.expect(purgeCheckpoint.args[1][1]).to.deep.equal({ params: { seq: '121-222' }, headers: POUCHDB_OPTIONS.remote_headers });
        chai.expect(purgeCheckpoint.args[2][1]).to.deep.equal({ params: { seq: '131-222' }, headers: POUCHDB_OPTIONS.remote_headers });
      });
    });

    it('should skip updating docs that are not found', () => {
      const purgeChanges = http.get.withArgs('/api/v1/server-side-purge/changes');
      const purgeCheckpoint = http.get.withArgs('/api/v1/server-side-purge/checkpoint');

      purgeChanges
        .onCall(0).resolves({ data: { purged_ids: ['id1', 'id2', 'id3'], last_seq: '111-222' }})
        .onCall(1).resolves({ data: { purged_ids: [], last_seq: '111-222' }});

      purgeCheckpoint.withArgs('/api/v1/server-side-purge/checkpoint').resolves();

      allDocs
        .withArgs({ keys: ['id1', 'id2', 'id3'] })
        .resolves({ rows: [
            { key: 'id1', error: 'whatever' },
            { key: 'id2', error: 'not_found', reason: 'deleted' },
            { id: 'id3', key: 'id3', value: { rev: '13-abc' } },
          ]});

      bulkDocs.resolves([]);

      return service.sync().then(() => {
        chai.expect(purgeChanges.callCount).to.equal(2);
        chai.expect(allDocs.callCount).to.equal(1);
        chai.expect(allDocs.args[0]).to.deep.equal([{ keys: ['id1', 'id2', 'id3'] }]);
        chai.expect(bulkDocs.callCount).to.equal(1);
        chai.expect(bulkDocs.args[0]).to.deep.equal([[{ _id: 'id3', _rev: '13-abc', _deleted: true, purged: true }]]);
        chai.expect(purgeCheckpoint.callCount).to.equal(1);
        chai.expect(purgeCheckpoint.args[0][1].params).to.deep.equal({ seq: '111-222' });
      });
    });

    it('should throw an error when purge save is not successful', () => {
      const purgeChanges = http.get.withArgs('/api/v1/server-side-purge/changes');
      const purgeCheckpoint = http.get.withArgs('/api/v1/server-side-purge/checkpoint');

      purgeChanges.resolves({ data: { purged_ids: ['id1', 'id2', 'id3'], last_seq: '111-222' }});

      allDocs
        .withArgs({ keys: ['id1', 'id2', 'id3'] })
        .resolves({ rows: [
            { id: 'id1', key: 'id1', value: { rev: '11-abc' } },
            { id: 'id2', key: 'id2', value: { rev: '12-abc' } },
            { id: 'id3', key: 'id3', value: { rev: '13-abc' } },
          ]});

      bulkDocs.resolves([
        { id: 'id1', error: 'conflict' },
        { id: 'id2', ok: true, rev: 'new' },
        { id: 'id3', error: 'whatever' }
      ]);

      const onUpdate = sinon.stub();
      service.addUpdateListener(onUpdate);

      return service.sync().then(() => {
        chai.expect(purgeChanges.callCount).to.equal(1);
        chai.expect(allDocs.callCount).to.equal(1);
        chai.expect(bulkDocs.callCount).to.equal(1);
        chai.expect(purgeCheckpoint.callCount).to.equal(0);

        expect(onUpdate.callCount).to.eq(2);
        expect(onUpdate.args[0][0]).to.deep.eq({ state: 'inProgress' });
        expect(onUpdate.args[1][0]).to.deep.eq({ to: 'success', from: 'required' });
      });
    });
  });

});
