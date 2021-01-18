import { TestBed, async, tick, fakeAsync } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { NgZone } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
window.PouchDB = require('pouchdb-browser').default;

import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';
import { LocationService } from '@mm-services/location.service';
import * as assert from 'assert';
import PouchDb from 'pouchdb-browser';

describe('Db Service', () => {
  let service:DbService;
  let sessionService;
  let locationService;
  let originalPouchDB;
  let pouchDB;
  let pouchResponse;
  let runOutsideAngular;
  //let runInsideAngular;

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

  beforeEach(async(() => {
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

    runOutsideAngular = sinon.stub(NgZone.prototype, 'runOutsideAngular').callsArg(0);
    sinon.stub(NgZone.prototype, 'run').callsArg(0);
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
      window.PouchDB = originalPouchDB;
      // avoid the 2dbs being initialized at the startup
      // we're just using 1 set of stubs so the calls will be mirrored if requiring 2 dbs
      sessionService.isOnlineOnly.returns(true);
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
            { map: function(doc) { return doc.type; }, reduce: function(doc) { return doc.reduce; } },
            { reduce: true, include_docs: true },
          ],
        },
        {
          args: [
            function(doc) { return doc.count; },
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
        it(`should stub ${method}`, fakeAsync(() => {
          const stubbedMethod = sinon.stub(PouchDb.prototype, method);
          getService();
          const db = service.get();

          expect(stubbedMethod.callCount).to.equal(0);

          methods[method].forEach((args) => {
            sinon.resetHistory();
            db[method](...args);
            expect(stubbedMethod.callCount).to.equal(1);
            expect(stubbedMethod.args[0]).to.deep.equal([args]);
            expect(runOutsideAngular.callCount).to.equal(1);
          });
        }));
      }
    }

    it('should work with a resolving promise', fakeAsync(async () => {
      sinon.stub(PouchDb.prototype, 'get').resolves({ the: 'thing' });
      getService();
      const db = service.get();

      const result = await db.get('thing');
      expect(result).to.deep.equal({ the: 'thing' });
    }));

    it('should work with a rejecting promise', fakeAsync(async () => {
      sinon.stub(PouchDb.prototype, 'get').rejects({ code: 404 });

      getService();
      const db = service.get();

      try {
        await db.get('thing');
        assert.fail('should have failed');
      } catch(err) {
        expect(err).to.deep.equal({ code: 404 });
      }
    }));

    describe('changes', () => {
      beforeEach(() => {
        // avoid the 2dbs being initialized at the startup
        // we're just using 1 set of stubs so the calls will be mirrored if requiring 2 dbs
        sessionService.isOnlineOnly.returns(true);
        sessionService.userCtx.returns({ name: 'mary' });
      });

      it('should call with correct params', fakeAsync(() => {
        const options = { live: false, include_docs: false, since: '123' };
        const changesSpy = sinon.spy(PouchDb.prototype, 'changes');

        getService();
        const db = service.get();

        // can't use await, changes doesn't return a promise
        // it returns an event emitter with an attached `then` property!
        // see https://github.com/pouchdb/pouchdb/blob/master/packages/node_modules/pouchdb-core/src/changes.js
        return db.changes(options).then((result) => {
          expect(result).to.deep.equal({ results: [], last_seq: '123'});
          expect(runOutsideAngular.callCount).to.equal(1);
          expect(changesSpy.callCount).to.equal(1);
          expect(changesSpy.args[0]).to.deep.equal([options]);
        });
      }));

      it('should return full results', fakeAsync(async () => {
        const options = { live: false, include_docs: true };
        const changesSpy = sinon.spy(PouchDb.prototype, 'changes');

        getService();
        const db = service.get();
        await db.put({ _id: uuidv4() });
        await db.put({ _id: uuidv4() });

        const a = await db.allDocs();
        console.log(a);
        const nbrDocs = (await db.allDocs()).rows.length;

        // can't use await, changes doesn't return a promise
        // it returns an event emitter with an attached `then` property!
        // see https://github.com/pouchdb/pouchdb/blob/master/packages/node_modules/pouchdb-core/src/changes.js
        return db.changes(options).then((result) => {
          expect(result.changes.length).to.equal(nbrDocs);
          expect(runOutsideAngular.callCount).to.equal(1);
          expect(changesSpy.callCount).to.equal(1);
          expect(changesSpy.args[0]).to.deep.equal([options]);
        });
      }));
    });

  });
});
