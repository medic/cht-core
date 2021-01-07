import { TestBed, async, tick, fakeAsync } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
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
  let runInsideAngular;

  const getService = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: SessionService, useValue: sessionService },
        { provide: LocationService, useValue: locationService },
      ],
    });

    service = TestBed.inject(DbService);
    tick(1000);
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
    pouchDB = sinon.stub().returns(pouchResponse);
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
      locationService.url = 'ftp//myhost:21/medicdb';
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
      expect(pouchDB.args[2][0]).to.equal('ftp//myhost:21/medicdb');
      expect(pouchDB.args[2][1].skip_setup).to.equal(true);

      // get remote meta
      service.get({ remote: true, meta: true });
      expect(pouchDB.callCount).to.equal(4);
      expect(pouchDB.args[3][0]).to.equal('ftp//myhost:21/medicdb-user-johnny-meta');
      expect(pouchDB.args[3][1].skip_setup).to.equal(false);
    }));

    it('caches pouchdb instances', fakeAsync(() => {
      sessionService.isOnlineOnly.returns(false);
      locationService.dbName = 'medicdb';
      locationService.url = 'ftp//myhost:21/medicdb';
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
      locationService.url = 'ftp//myhost:21/medicdb';
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
      expect(pouchDB.args[2][0]).to.equal('ftp//myhost:21/medicdb');

      // get remote meta
      service.get({ remote: true, meta: true });
      expect(pouchDB.callCount).to.equal(4);
      expect(pouchDB.args[3][0]).to.equal('ftp//myhost:21/medicdb-user-johnny(46)(60)(62)(94)(44)(63)(33)-meta');
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
      locationService.url = 'ftp//myhost:21/medicdb';

      // init
      getService();
      expect(pouchDB.callCount).to.equal(0);
      expect(pouchResponse.viewCleanup.callCount).to.equal(0);

      // get local returns remote
      const actual = service.get();
      expect(pouchDB.callCount).to.equal(1);
      expect(actual.id).to.equal(pouchResponse.id);
      expect(pouchDB.args[0][0]).to.equal('ftp//myhost:21/medicdb');
      expect(pouchResponse.viewCleanup.callCount).to.equal(0);

      // get locale  meta returns remote meta
      service.get({ meta: true });
      expect(pouchDB.callCount).to.equal(2);
      expect(pouchDB.args[1][0]).to.equal('ftp//myhost:21/medicdb-user-johnny-meta');
    }));
  });
});
