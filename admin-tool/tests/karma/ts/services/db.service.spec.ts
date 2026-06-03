import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { DbService } from '@admin-tool-services/db.service';
import { LocationService } from '@admin-tool-services/location.service';

describe('DbService', () => {
  let service: DbService;
  let locationService;
  let originalPouchDB;
  let pouchDB;
  let pouchInstance;

  const getService = () => {
    TestBed.configureTestingModule({
      providers: [{ provide: LocationService, useValue: locationService }],
    });
    service = TestBed.inject(DbService);
  };

  beforeEach(() => {
    locationService = { url: 'http://localhost:5984/medic' };

    pouchInstance = {
      destroy: sinon.stub().resolves(),
      put: sinon.stub().resolves(),
      post: sinon.stub().resolves(),
      get: sinon.stub().resolves(),
      remove: sinon.stub().resolves(),
      bulkDocs: sinon.stub().resolves(),
      bulkGet: sinon.stub().resolves(),
      allDocs: sinon.stub().resolves(),
      putAttachment: sinon.stub().resolves(),
      getAttachment: sinon.stub().resolves(),
      removeAttachment: sinon.stub().resolves(),
      query: sinon.stub().resolves(),
      viewCleanup: sinon.stub().resolves(),
      info: sinon.stub().resolves({ update_seq: 0 }),
      compact: sinon.stub().resolves(),
      revsDiff: sinon.stub().resolves(),
      changes: sinon.stub().returns({
        on: sinon.stub().returnsThis(),
        then: sinon.stub(),
        catch: sinon.stub(),
        cancel: sinon.stub(),
      }),
      sync: sinon.stub().returns({
        on: sinon.stub().returnsThis(),
        then: sinon.stub(),
        catch: sinon.stub(),
        cancel: sinon.stub(),
      }),
      replicate: {
        from: sinon.stub(),
        to: sinon.stub(),
      },
    };

    originalPouchDB = window.PouchDB;
    pouchDB = sinon.stub().returns({ ...pouchInstance });
    (window as any).PouchDB = pouchDB;
  });

  afterEach(() => {
    sinon.restore();
    window.PouchDB = originalPouchDB;
  });

  describe('get', () => {
    it('should create a PouchDB instance with the location url and skip_setup', () => {
      getService();

      service.get();

      expect(pouchDB.callCount).to.equal(1);
      expect(pouchDB.args[0][0]).to.equal('http://localhost:5984/medic');
      expect(pouchDB.args[0][1]).to.have.property('skip_setup', true);
    });

    it('should cache and return the same instance on subsequent calls', () => {
      getService();

      const first = service.get();
      const second = service.get();

      expect(pouchDB.callCount).to.equal(1);
      expect(first).to.equal(second);
    });

    it('should wrap promise methods to delegate to the db', async () => {
      getService();
      const doc = { _id: 'test', _rev: '1-abc' };
      pouchDB.returns({ ...pouchInstance, get: sinon.stub().resolves(doc) });

      const db = service.get();
      const result = await db.get('test');

      expect(result).to.deep.equal(doc);
    });

    it('should wrap the changes method to return an event emitter', () => {
      const changeEmitter = {
        on: sinon.stub().returnsThis(),
        then: sinon.stub(),
        catch: sinon.stub(),
        cancel: sinon.stub(),
      };
      pouchDB.returns({ ...pouchInstance, changes: sinon.stub().returns(changeEmitter) });
      getService();

      const db = service.get();
      const result = db.changes({ live: true, since: 'now' });

      expect(result).to.have.property('on');
      expect(result).to.have.property('cancel');
    });

    it('should forward change events from the underlying emitter', (done) => {
      const listeners: Record<string, Function> = {};
      const changeEmitter = {
        on: (event, cb) => {
          listeners[event] = cb;
          return changeEmitter;
        },
        then: sinon.stub(),
        catch: sinon.stub(),
        cancel: sinon.stub(),
      };
      pouchDB.returns({ ...pouchInstance, changes: sinon.stub().returns(changeEmitter) });
      getService();

      const db = service.get();
      const promiseEmitter = db.changes({ live: true, since: 'now' });

      const expected = { id: 'doc1', seq: 5 };
      promiseEmitter.on('change', (change) => {
        expect(change).to.deep.equal(expected);
        done();
      });

      listeners['change'](expected);
    });

    it('should wrap the sync method to return an event emitter', (done) => {
      const listeners: Record<string, Function> = {};
      const syncEmitter = {
        on: (event, cb) => {
          listeners[event] = cb;
          return syncEmitter;
        },
        then: sinon.stub(),
        catch: sinon.stub(),
        cancel: sinon.stub(),
      };
      pouchDB.returns({ ...pouchInstance, sync: sinon.stub().returns(syncEmitter) });
      getService();

      const db = service.get();
      const promiseEmitter = db.sync('http://localhost/other', { live: true });

      const expected = { ok: true };
      promiseEmitter.on('complete', (result) => {
        expect(result).to.deep.equal(expected);
        done();
      });

      listeners['complete'](expected);
    });

    it('should expose replicate property after wrapping', () => {
      getService();
      const db = service.get();
      expect(db.replicate).to.exist;
      expect(db.replicate).to.have.property('from');
      expect(db.replicate).to.have.property('to');
    });
  });
});
