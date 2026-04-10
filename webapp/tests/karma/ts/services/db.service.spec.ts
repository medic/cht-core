import { TestBed, tick, fakeAsync, waitForAsync } from '@angular/core/testing';
import sinon from 'sinon';
import { expect, assert } from 'chai';
import { NgZone } from '@angular/core';

import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';
import { LocationService } from '@mm-services/location.service';

describe('Db Service', () => {
  let service:DbService;
  let sessionService;
  let locationService;
  let originalPouchDB;
  let pouchDB;
  let pouchResponse;
  let runOutsideAngular;

  const getService = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: SessionService, useValue: sessionService },
        { provide: LocationService, useValue: locationService },
      ],
    });

    service = TestBed.inject(DbService);
    tick(1000); // trigger the viewCleanup timeout
  };

  beforeEach(waitForAsync(() => {
    sessionService = {
      userCtx: sinon.stub(),
      isOnlineOnly: sinon.stub(),
    };
    locationService = {};

    originalPouchDB = window.PouchDB;
    pouchResponse = {
      id: 'hello',
      destroy: sinon.stub(),
      put: sinon.stub(),
      post: sinon.stub(),
      get: sinon.stub(),
      remove: sinon.stub(),
      bulkDocs: sinon.stub(),
      bulkGet: sinon.stub(),
      allDocs: sinon.stub(),
      putAttachment: sinon.stub(),
      getAttachment: sinon.stub(),
      removeAttachment: sinon.stub(),
      query: sinon.stub(),
      viewCleanup: sinon.stub(),
      info: sinon.stub(),
      compact: sinon.stub(),
      revsDiff: sinon.stub(),
      changes: sinon.stub(),
      sync: sinon.stub(),
      replicate: {
        from: sinon.stub(),
        to: sinon.stub(),
      },
    };

    pouchDB = sinon.stub().returns({ ...pouchResponse });
    window.PouchDB = pouchDB;

    runOutsideAngular = sinon.spy(NgZone.prototype, 'runOutsideAngular');
  }));

  afterEach(() => {
    sinon.restore();
    window.PouchDB = originalPouchDB;
  });

  describe('get remote', () => {

    it('sets skip setup', fakeAsync(() => {
      sessionService.isOnlineOnly.returns(false);
      locationService.dbName = 'medicdb';
      locationService.url = 'ftp://myhost:21/medicdb';
      sessionService.userCtx.returns({ name: 'johnny' });

      // init
      getService();

      expect(pouchDB.callCount).to.equal(2);
      expect(pouchDB.args[0][0]).to.equal('medicdb-user-johnny');
      expect(pouchDB.args[1][0]).to.equal('medicdb-user-johnny-meta');

      // get remote
      const actual = service.get({ remote: true });
      expect(actual.id).to.equal(pouchResponse.id);
      expect(pouchDB.callCount).to.equal(3);
      expect(pouchDB.args[2][0]).to.equal('ftp://myhost:21/medicdb');
      expect(pouchDB.args[2][1].skip_setup).to.equal(true);

      // get remote meta
      service.get({ remote: true, meta: true });
      expect(pouchDB.callCount).to.equal(4);
      expect(pouchDB.args[3][0]).to.equal('ftp://myhost:21/medicdb-user-johnny-meta');
      expect(pouchDB.args[3][1].skip_setup).to.equal(false);
    }));

    it('caches pouchdb instances', fakeAsync(() => {
      sessionService.isOnlineOnly.returns(false);
      locationService.dbName = 'medicdb';
      locationService.url = 'ftp://myhost:21/medicdb';
      sessionService.userCtx.returns({ name: 'johnny' });

      // init
      getService();

      expect(pouchDB.callCount).to.equal(2);
      expect(pouchDB.args[0][0]).to.equal('medicdb-user-johnny');
      expect(pouchDB.args[1][0]).to.equal('medicdb-user-johnny-meta');

      // get remote
      const actual1 = service.get({ remote: true });
      expect(actual1.id).to.equal(pouchResponse.id);
      expect(pouchDB.callCount).to.equal(3);

      // get remote again
      const actual2 = service.get({ remote: true });
      expect(actual2.id).to.equal(pouchResponse.id);
      expect(pouchDB.callCount).to.equal(3);
    }));

    /**
     * Escape database names when talking to CouchDB.
     * Must be kept in sync with medic-api/lib/userDb.js
     */
    it('escapes invalid database characters - #3778', fakeAsync(() => {
      sessionService.isOnlineOnly.returns(false);
      locationService.dbName = 'medicdb';
      locationService.url = 'ftp://myhost:21/medicdb';
      sessionService.userCtx.returns({ name: 'johnny.<>^,?!' });

      // init
      getService();

      expect(pouchDB.callCount).to.equal(2);
      expect(pouchDB.args[0][0]).to.equal('medicdb-user-johnny.<>^,?!');
      expect(pouchDB.args[1][0]).to.equal('medicdb-user-johnny.<>^,?!-meta');

      // get remote
      const actual = service.get({ remote: true });
      expect(actual.id).to.equal(pouchResponse.id);
      expect(pouchDB.callCount).to.equal(3);
      expect(pouchDB.args[2][0]).to.equal('ftp://myhost:21/medicdb');

      // get remote meta
      service.get({ remote: true, meta: true });
      expect(pouchDB.callCount).to.equal(4);
      expect(pouchDB.args[3][0]).to.equal('ftp://myhost:21/medicdb-user-johnny(46)(60)(62)(94)(44)(63)(33)-meta');
    }));
  });

  describe('get local', () => {

    it('sets auto compaction', fakeAsync(() => {
      sessionService.isOnlineOnly.returns(false);
      locationService.dbName = 'medicdb';
      sessionService.userCtx.returns({ name: 'johnny' });

      // init
      getService();

      expect(pouchDB.callCount).to.equal(2);
      expect(pouchResponse.viewCleanup.callCount).to.equal(2);

      // get local
      const actual = service.get();
      expect(pouchDB.callCount).to.equal(2);
      expect(actual.id).to.equal(pouchResponse.id);
      expect(pouchDB.args[0][0]).to.equal('medicdb-user-johnny');
      expect(pouchDB.args[0][1].auto_compaction).to.equal(true);
      expect(pouchDB.args[1][0]).to.equal('medicdb-user-johnny-meta');
      expect(pouchDB.args[1][1].auto_compaction).to.equal(true);
      expect(pouchResponse.viewCleanup.callCount).to.equal(2);
    }));

    it('caches pouchdb instances', fakeAsync(() => {
      sessionService.isOnlineOnly.returns(false);
      locationService.dbName = 'medicdb';
      sessionService.userCtx.returns({ name: 'johnny' });

      // init
      getService();
      expect(pouchDB.callCount).to.equal(2);

      // get local
      const actual1 = service.get();
      expect(pouchDB.callCount).to.equal(2);
      expect(actual1.id).to.equal(pouchResponse.id);

      // get local again
      const actual2 = service.get();
      expect(pouchDB.callCount).to.equal(2);
      expect(actual2.id).to.equal(pouchResponse.id);
      expect(sessionService.isOnlineOnly.callCount).to.equal(1);
      expect(sessionService.userCtx.callCount).to.equal(4);
    }));

    it('returns remote for admin user', fakeAsync(() => {
      sessionService.isOnlineOnly.returns(true);
      sessionService.userCtx.returns({ name: 'johnny' });
      locationService.url = 'ftp://myhost:21/medicdb';

      // init
      getService();
      expect(pouchDB.callCount).to.equal(0);
      expect(pouchResponse.viewCleanup.callCount).to.equal(0);

      // get local returns remote
      const actual = service.get();
      expect(pouchDB.callCount).to.equal(1);
      expect(actual.id).to.equal(pouchResponse.id);
      expect(pouchDB.args[0][0]).to.equal('ftp://myhost:21/medicdb');
      expect(pouchResponse.viewCleanup.callCount).to.equal(0);

      // get locale  meta returns remote meta
      service.get({ meta: true });
      expect(pouchDB.callCount).to.equal(2);
      expect(pouchDB.args[1][0]).to.equal('ftp://myhost:21/medicdb-user-johnny-meta');
    }));
  });

  describe('method wrapping', () => {
    beforeEach(() => {
      // we're just using 1 set of stubs so the calls will be mirrored if requiring 2 dbs
      sessionService.isOnlineOnly.returns(false);
      locationService.dbName = 'cht';
      sessionService.userCtx.returns({ name: 'mary' });
    });

    const methods = {
      destroy: [
        { args: [] }
      ],
      put: [
        { args: [{ _id: 'doc', val: true }] },
        { args: [{ _id: 'doc', val: false }, { options: true }] },
      ],
      post: [
        { args: [{ _id: 'doc', val: false }] },
        { args: [{ _id: 'doc', val: false }, { options: true }] },
      ],
      get: [
        { args: ['the_uuid'] },
        { args: ['the_uuid', { revs: true }] },
      ],
      remove: [
        { args: [{ _id: 'id', prop: true }] },
        { args: [{ _id: 'id', prop: true }, { options: false }] },
      ],
      bulkGet: [
        { args: [[ { id: 'id1' } ]] },
        { args: [[ { id: 'id1' }, { id: 'id2', rev: '2' } ]] },
      ],
      allDocs: [
        { args: [{ keys: ['a', 'b', 'c'], include_docs: true }] },
        { args: [{ start_key: '333', include_docs: true }] },
      ],
      putAttachment: [
        { args: ['doc_id', 'att_id', { the: 'attachment' }, 'text/plain'] },
        { args: ['doc_id2', 'att', 'rev', 'some text', 'text/html'] },
      ],
      getAttachment: [
        { args: ['doc_id', 'att_id'] },
        { args: ['doc_id', 'att_id', { the: 'options' }] },
      ],
      removeAttachment: [
        { args: ['docUuid', 'att.txt', '_rev'] },
      ],
      query: [
        { args: ['design/view', { reduce: false, include_docs: true }] },
        {
          args: [
            { map: (doc) => doc.type, reduce: (doc) => doc.reduce },
            { reduce: true, include_docs: true },
          ],
        },
        {
          args: [
            (doc) => doc.count,
            { start_key: 'aaa', end_key: 'bbb' },
          ],
        },
      ],
      viewCleanup: [{ args: [] }],
      info: [{ args: [] }],
      compact: [
        { args: [] },
        { args: [{ options: true }] },
      ],
      revsDiff: [
        { args: [[ { id: 'a', rev: '1' }, { id: 'b', rev: '2' } ]] },
      ],
    };

    for (const method in methods) {
      if (methods[method]) {
        it(`should wrap ${method}`, fakeAsync(() => {
          getService();
          const db = service.get();

          methods[method].forEach(({ args }) => {
            // reset to drop the constructor's viewCleanup calls and any prior iteration
            sinon.resetHistory();
            db[method](...args);
            expect(pouchResponse[method].callCount).to.equal(1);
            expect(pouchResponse[method].args[0]).to.deep.equal(args);
            expect(runOutsideAngular.called).to.be.true;
          });
        }));
      }
    }

    it('should work with a resolving promise', fakeAsync(async () => {
      pouchResponse.put.resolves({ ok: true });
      pouchResponse.get.resolves({ _id: 'thing' });
      getService();
      const db = service.get();
      await db.put({ _id: 'thing' });
      const result = await db.get('thing');
      expect(result).to.deep.equal({ _id: 'thing' });
    }));

    it('should work with a rejecting promise', fakeAsync(async () => {
      pouchResponse.get.rejects({ docId: 'thing2', status: 404 });
      getService();
      const db = service.get();

      try {
        await db.get('thing2');
        assert.fail('should have failed');
      } catch (err) {
        expect(err).to.deep.equal({ docId: 'thing2', status: 404 });
      }
    }));
  });
});
