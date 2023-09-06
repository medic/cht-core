import { TestBed, tick, fakeAsync, waitForAsync } from '@angular/core/testing';
import sinon from 'sinon';
import * as chai from 'chai';
import * as chaiExclude from 'chai-exclude';
//@ts-ignore
chai.use(chaiExclude);
import { expect, assert } from 'chai';
import { NgZone } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';

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
  let runInsideAngular;

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

    runOutsideAngular = sinon.stub(NgZone.prototype, 'runOutsideAngular').callsArg(0);
    runInsideAngular = sinon.stub(NgZone.prototype, 'run').callsArg(0);
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
      window.PouchDB = require('pouchdb-browser').default;
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
        it(`should stub ${method}`, fakeAsync(() => {
          const stubbedMethod = sinon.stub(window.PouchDB.prototype, method);
          getService();
          const db = service.get();

          expect(stubbedMethod.callCount).to.equal(0);

          methods[method].forEach(({ args }) => {
            sinon.resetHistory();
            db[method](...args);
            expect(stubbedMethod.callCount).to.equal(1);
            expect(stubbedMethod.args[0]).to.deep.equal(args);
            expect(runOutsideAngular.callCount).to.equal(1);
          });
        }));
      }
    }

    it('should work with a resolving promise', fakeAsync(async () => {
      sinon.stub(window.PouchDB.prototype, 'get').resolves({ the: 'thing' });
      getService();
      const db = service.get();

      const result = await db.get('thing');
      expect(result).to.deep.equal({ the: 'thing' });
    }));

    it('should work with a rejecting promise', fakeAsync(async () => {
      sinon.stub(window.PouchDB.prototype, 'get').rejects({ code: 404 });

      getService();
      const db = service.get();

      try {
        await db.get('thing');
        assert.fail('should have failed');
      } catch (err) {
        expect(err).to.deep.equal({ code: 404 });
      }
    }));

    describe('changes', () => {
      // because of how complex the Changes PouchDB object is, these are integration tests, not unit tests
      it('should call with correct params', fakeAsync(() => {
        const options = { live: false, include_docs: false, since: '123' };
        const changesSpy = sinon.spy(window.PouchDB.prototype, 'changes');

        getService();
        const db = service.get();
        sinon.stub(NgZone, 'isInAngularZone').onCall(0).returns(true);

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
        const changesSpy = sinon.spy(window.PouchDB.prototype, 'changes');

        getService();
        const db = service.get();
        await db.put({ _id: uuidv4() });
        await db.put({ _id: uuidv4() });
        const allDocs = (await db.allDocs({ include_docs: true })).rows;
        const info = await db.info();
        sinon.resetHistory();
        sinon.stub(NgZone, 'isInAngularZone').onCall(0).returns(true);

        // can't use await, changes doesn't return a promise
        // it returns an event emitter with an attached `then` property!
        // see https://github.com/pouchdb/pouchdb/blob/master/packages/node_modules/pouchdb-core/src/changes.js
        return db.changes(options).then((result) => {
          expect(result.results.length).to.equal(allDocs.length);
          const idsRevsPairs = allDocs.map(item => ({
            id: item.id,
            changes: [{ rev: item.value.rev }],
            doc: item.doc,
          }));
          expect(result.results)
            .excludingEvery(['seq'])
            .to.have.deep.members(idsRevsPairs);
          expect(result.last_seq).to.equal(info.update_seq);
          expect(runOutsideAngular.callCount).to.equal(1);
          expect(changesSpy.callCount).to.equal(1);
          expect(changesSpy.args[0]).to.deep.equal([options]);
        });
      }));

      it('should attach "on" events and run them in the zone', fakeAsync(async () => {
        const changesSpy = sinon.spy(window.PouchDB.prototype, 'changes');

        getService();
        const db = service.get();
        await db.put({ _id: uuidv4() });
        await db.put({ _id: uuidv4() });
        sinon.resetHistory();

        const onChange = sinon.stub();
        const onComplete = sinon.stub();
        sinon.stub(NgZone, 'isInAngularZone').onCall(0).returns(true);

        // can't use await, changes doesn't return a promise
        // it returns an event emitter with an attached `then` property!
        // see https://github.com/pouchdb/pouchdb/blob/master/packages/node_modules/pouchdb-core/src/changes.js
        return db
          .changes({ live: false })
          .on('change', onChange)
          .on('complete', onComplete)
          .then(results => {
            expect(changesSpy.callCount).to.equal(1);
            expect(changesSpy.args[0]).to.deep.equal([{ live: false, return_docs: true }]);

            expect(runOutsideAngular.callCount).to.equal(1);
            expect(onChange.callCount).to.equal(results.results.length);
            expect(onComplete.callCount).to.equal(1);

            expect(runInsideAngular.callCount).to.equal(results.results.length + 1);
          });
      }));

      it('should correctly bind catch', fakeAsync(async () => {
        const changesSpy = sinon.spy(window.PouchDB.prototype, 'changes');
        const opts = {
          live: false,
          filter: () => {
            throw new Error('error in filter');
          },
        };

        getService();
        const db = service.get();
        const onError = sinon.stub();
        sinon.stub(NgZone, 'isInAngularZone').onCall(0).returns(true);

        return db
          .changes(opts)
          .on('error', onError)
          .then(() => assert.fail('should have thrown'))
          .catch((err) => {
            expect(err.status).to.equal(400);
            expect(err.name).to.equal('bad_request');

            expect(changesSpy.callCount).to.equal(1);
            expect(onError.callCount).to.equal(1);
            expect(onError.args[0][0]).to.equal(err);

            expect(runOutsideAngular.callCount).to.equal(1);
            expect(runInsideAngular.callCount).to.equal(1);
          });
      }));
    });

    describe('sync', () => {
      // because of how complex the Sync PouchDB object is, these are integration tests, not unit tests
      it('should call with correct params', fakeAsync(() => {
        const options = { live: false, since: '123' };
        const syncSpy = sinon.spy(window.PouchDB.prototype, 'sync');
        const target = window.PouchDB(`db-${uuidv4()}`);

        getService();
        const db = service.get();

        sinon.stub(NgZone, 'isInAngularZone').onCall(0).returns(true);
        sinon.resetHistory();

        // can't use await, sync doesn't return a promise
        // it returns an event emitter with an attached `then` property!
        return db.sync(target, options).then((result) => {
          expect(result)
            .excludingEvery(['doc_write_failures', 'docs_read', 'docs_written', 'end_time', 'start_time'])
            .to.deep.nested.include({
              pull: {
                ok: true,
                errors: [],
                last_seq: '123',
                status: 'complete',
              },
              push: {
                ok: true,
                errors: [],
                last_seq: '123',
                status: 'complete',
              },
            });
          expect(syncSpy.callCount).to.equal(1);
          expect(syncSpy.args[0]).to.deep.equal([target, options]);
          expect(runOutsideAngular.called).to.equal(true);
        });
      }));

      it('should do a full sync', fakeAsync(async () => {
        const options = { live: false };
        const syncSpy = sinon.spy(window.PouchDB.prototype, 'sync');
        const target = window.PouchDB(`db-${uuidv4()}`);

        getService();
        const db = service.get();
        await db.put({ _id: uuidv4() });
        await db.put({ _id: uuidv4() });
        const allDocs = (await db.allDocs()).rows;
        const info = await db.info();

        sinon.stub(NgZone, 'isInAngularZone').onCall(0).returns(true);
        sinon.resetHistory();

        // can't use await, sync doesn't return a promise
        // it returns an event emitter with an attached `then` property!
        return db.sync(target, options).then((result) => {
          expect(result)
            .excludingEvery(['doc_write_failures', 'end_time', 'start_time'])
            .to.deep.nested.include({
              push: {
                docs_read: allDocs.length,
                docs_written: allDocs.length,
                ok: true,
                errors: [],
                last_seq: info.update_seq,
                status: 'complete',
              },
              pull: {
                docs_read: 0,
                docs_written: 0,
                ok: true,
                errors: [],
                last_seq: 0,
                status: 'complete',
              },
            });

          expect(syncSpy.callCount).to.equal(1);
          expect(syncSpy.args[0]).to.deep.equal([target, options]);
          // sync actually calls a bunch of underlying pouchdb methods which we have wrapped
          expect(runOutsideAngular.called).to.equal(true);
        });
      }));

      it('should attach "on" events and run them in the zone', fakeAsync(async () => {
        const syncSpy = sinon.spy(window.PouchDB.prototype, 'sync');
        const target = window.PouchDB(`db-${uuidv4()}`);

        getService();
        const db = service.get();
        await db.put({ _id: uuidv4() });
        await db.put({ _id: uuidv4() });
        sinon.resetHistory();

        const onChange = sinon.stub();
        const onComplete = sinon.stub();
        sinon.stub(NgZone, 'isInAngularZone').returns(true);

        const batchSize = 50;

        // can't use await, sync doesn't return a promise
        // it returns an event emitter with an attached `then` property!
        return db
          .sync(target, { live: false, batch_size: batchSize })
          .on('change', onChange)
          .on('complete', onComplete)
          .then(results => {
            expect(syncSpy.callCount).to.equal(1);
            expect(syncSpy.args[0]).to.deep.equal([target, { live: false, batch_size: batchSize }]);

            // sync actually calls a bunch of underlying pouchdb methods which we have wrapped
            expect(runOutsideAngular.called).to.equal(true);

            expect(onChange.callCount).to.equal(Math.ceil(results.push.docs_written / batchSize));
            expect(onComplete.callCount).to.equal(1);

            // sync actually calls a bunch of underlying pouchdb methods which we have wrapped and emit events
            expect(runInsideAngular.callCount).to.be.at.least(results.push.docs_written);
          });
      }));

      it('should catch errors', fakeAsync(async () => {
        const target = window.PouchDB(`db-${uuidv4()}`);
        const opts = { live: false, retry: false };

        getService();
        const db = service.get();
        const onError = sinon.stub();
        const onComplete = sinon.stub();
        await target.bulkDocs([{ _id: uuidv4() }]);
        sinon.stub(target, 'allDocs').rejects({ status: 400, name: 'forbidden' });
        sinon.stub(NgZone, 'isInAngularZone').returns(true);

        return db
          .sync(target, opts)
          .on('error', onError)
          .on('complete', onComplete)
          .then(() => {
            expect(onComplete.callCount).to.equal(0);
            expect(onError.callCount).to.equal(1);
            expect(onError.args[0][0].status).to.deep.equal(400);
            expect(runInsideAngular.called).to.equal(true);
          });
      }));
    });

    describe('replicate', () => {
      // because of how complex the replicate PouchDB object is, these are integration tests, not unit tests
      describe('to', () => {
        it('should call with correct params', fakeAsync(() => {
          const options = { live: false, since: '123' };
          const target = window.PouchDB(`db-${uuidv4()}`);

          getService();
          const db = service.get();
          sinon.stub(NgZone, 'isInAngularZone').returns(true);
          sinon.resetHistory();

          // can't use await, replicate doesn't return a promise
          // it returns an event emitter with an attached `then` property!
          return db.replicate.to(target, options).then((result) => {
            expect(result)
              .excludingEvery(['doc_write_failures', 'docs_read', 'docs_written', 'end_time', 'start_time'])
              .to.deep.nested.include({
                ok: true,
                errors: [],
                last_seq: '123',
                status: 'complete',
              });
          });
        }));

        it('should fully replicate', fakeAsync(async () => {
          const options = { live: false };
          const target = window.PouchDB(`db-${uuidv4()}`);

          getService();
          const db = service.get();
          await db.put({ _id: uuidv4() });
          await db.put({ _id: uuidv4() });
          const allDocs = (await db.allDocs()).rows;
          const info = await db.info();
          sinon.stub(NgZone, 'isInAngularZone').returns(true);
          sinon.resetHistory();

          // can't use await, replicate doesn't return a promise
          // it returns an event emitter with an attached `then` property!
          return db.replicate.to(target, options).then((result) => {
            expect(result)
              .excludingEvery(['doc_write_failures', 'end_time', 'start_time'])
              .to.deep.nested.include({
                docs_read: allDocs.length,
                docs_written: allDocs.length,
                ok: true,
                errors: [],
                last_seq: info.update_seq,
                status: 'complete',
              });
          });
        }));

        it('should attach "on" events and run them in the zone', fakeAsync(async () => {
          const target = window.PouchDB(`db-${uuidv4()}`);

          getService();
          const db = service.get();
          await db.put({ _id: uuidv4() });
          await db.put({ _id: uuidv4() });
          sinon.resetHistory();

          const onChange = sinon.stub();
          const onComplete = sinon.stub();
          sinon.stub(NgZone, 'isInAngularZone').returns(true);
          const batchSize = 50;

          // can't use await, replicate doesn't return a promise
          // it returns an event emitter with an attached `then` property!
          return db
            .replicate.to(target, { live: false, batch_size: batchSize })
            .on('change', onChange)
            .on('complete', onComplete)
            .then(results => {
              expect(onChange.callCount).to.equal(Math.ceil(results.docs_written / batchSize));
              expect(onComplete.callCount).to.equal(1);
              expect(runInsideAngular.called).to.equal(true);
            });
        }));

        it('should correctly bind catch', fakeAsync(async () => {
          const target = window.PouchDB(`db-${uuidv4()}`);
          const opts = { live: false, retry: false, };

          getService();
          const db = service.get();
          const onError = sinon.stub();
          sinon.stub(NgZone, 'isInAngularZone').returns(true);
          sinon.stub(target, 'revsDiff').rejects({ code: 400 });

          return db
            .replicate.to(target, opts)
            .on('error', onError)
            .then(() => assert.fail('should have thrown'))
            .catch((err) => {
              expect(err.result).to.include({
                ok: false,
                docs_read: 0,
                docs_written: 0,
                last_seq: 0,
              });

              expect(onError.callCount).to.equal(1);
              expect(onError.args[0][0]).to.equal(err);
            });
        }));
      });

      describe('from', () => {
        it('should call with correct params', fakeAsync(async () => {
          const options = { live: false, since: '123' };
          const target = window.PouchDB(`db-${uuidv4()}`);

          getService();
          const db = service.get();
          sinon.stub(NgZone, 'isInAngularZone').returns(true);

          // can't use await, replicate doesn't return a promise
          // it returns an event emitter with an attached `then` property!
          return db.replicate.to(target, options).then((result) => {
            expect(result)
              .excludingEvery(['doc_write_failures', 'docs_read', 'docs_written', 'end_time', 'start_time'])
              .to.deep.nested.include({
                ok: true,
                errors: [],
                last_seq: '123',
                status: 'complete',
              });
          });
        }));

        it('should fully replicate', fakeAsync(async () => {
          const options = { live: false };
          const target = window.PouchDB(`db-${uuidv4()}`);

          getService();
          const db = service.get();

          await target.bulkDocs([{ _id: uuidv4() }, { _id: uuidv4() }]);
          const allDocs = (await target.allDocs()).rows;
          const info = await target.info();
          sinon.stub(NgZone, 'isInAngularZone').returns(true);

          // can't use await, replicate doesn't return a promise
          // it returns an event emitter with an attached `then` property!
          return db.replicate.from(target, options).then((result) => {
            expect(result)
              .excludingEvery(['doc_write_failures', 'end_time', 'start_time'])
              .to.deep.nested.include({
                docs_read: allDocs.length,
                docs_written: allDocs.length,
                ok: true,
                errors: [],
                last_seq: info.update_seq,
                status: 'complete',
              });
          });
        }));

        it('should attach "on" events and run them in the zone', fakeAsync(async () => {
          const target = window.PouchDB(`db-${uuidv4()}`);

          getService();
          const db = service.get();
          await target.bulkDocs([{ _id: uuidv4() }, { _id: uuidv4() }]);

          const onChange = sinon.stub();
          const onComplete = sinon.stub();
          sinon.stub(NgZone, 'isInAngularZone').returns(true);
          const batchSize = 50;

          // can't use await, replicate doesn't return a promise
          // it returns an event emitter with an attached `then` property!
          return db
            .replicate.from(target, { live: false, batch_size: batchSize })
            .on('change', onChange)
            .on('complete', onComplete)
            .then(results => {
              expect(onChange.callCount).to.equal(Math.ceil(results.docs_written / batchSize));
              expect(onComplete.callCount).to.equal(1);
              expect(runInsideAngular.called).to.equal(true);
            });
        }));

        it('should correctly bind catch', fakeAsync(async () => {
          const target = window.PouchDB(`db-${uuidv4()}`);
          const opts = { live: false, retry: false };

          getService();
          const db = service.get();
          const onError = sinon.stub();
          await target.bulkDocs([{ _id: uuidv4() }, { _id: uuidv4() }]);
          sinon.stub(target, 'allDocs').rejects({ code: 400 });
          sinon.stub(NgZone, 'isInAngularZone').returns(true);

          // can't use await, replicate doesn't return a promise
          // it returns an event emitter with an attached `then` property!
          return db
            .replicate.from(target, opts)
            .on('error', onError)
            .then(() => assert.fail('should have thrown'))
            .catch((err) => {
              expect(err.result).to.include({
                ok: false,
                docs_read: 0,
                docs_written: 0,
                last_seq: 0,
              });

              expect(onError.callCount).to.equal(1);
              expect(onError.args[0][0]).to.equal(err);
            });
        }));
      });

    });
  });
});
