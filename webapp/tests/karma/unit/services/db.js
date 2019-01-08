describe('DB service', () => {

  'use strict';

  let getService,
      Location,
      userCtx,
      pouchDB,
      expected,
      rootScope,
      isOnlineOnly;

  beforeEach(() => {
    Location = {};
    userCtx = sinon.stub();
    pouchDB = sinon.stub();
    expected = {
      id: 'hello',
      viewCleanup: sinon.stub(),
      installValidationMethods: sinon.stub(),
    };
    pouchDB.returns(expected);

    isOnlineOnly = sinon.stub();
    module('inboxApp');
    module($provide => {
      $provide.factory('$window', () => {
        return {
          angular: { callbacks: [] },
          PouchDB: {
            // stub for registering validation plugin
            plugin: () => {}
          }
        };
      });
      $provide.factory('pouchDB', () => {
        return pouchDB;
      });
      $provide.value('Session', {
        userCtx: userCtx,
        isOnlineOnly: isOnlineOnly
      } );
      $provide.value('Location', Location);
    });
    inject(($injector, $timeout, _$rootScope_) => {
      rootScope = _$rootScope_;
      getService = () => {
        // delay initialisation of the db service
        const service = $injector.get('DB');
        $timeout.flush();
        return service;
      };
    });
  });

  afterEach(() => {
    KarmaUtils.restore(pouchDB, userCtx, isOnlineOnly);
  });

  describe('get remote', () => {

    it('sets skip setup', () => {
      isOnlineOnly.returns(false);
      Location.dbName = 'medicdb';
      Location.url = 'ftp//myhost:21/medicdb';
      userCtx.returns({ name: 'johnny' });

      // init
      const service = getService();

      expect(pouchDB.callCount).to.equal(2);
      expect(pouchDB.args[0][0]).to.equal('medicdb-user-johnny');
      expect(pouchDB.args[1][0]).to.equal('medicdb-user-johnny-meta');

      // get remote
      const actual = service({ remote: true });
      expect(actual.id).to.equal(expected.id);
      expect(pouchDB.callCount).to.equal(3);
      expect(pouchDB.args[2][0]).to.equal('ftp//myhost:21/medicdb');
      expect(pouchDB.args[2][1].skip_setup).to.equal(true);

      // get remote meta
      service({ remote: true, meta: true });
      expect(pouchDB.callCount).to.equal(4);
      expect(pouchDB.args[3][0]).to.equal('ftp//myhost:21/medicdb-user-johnny-meta');
      expect(pouchDB.args[3][1].skip_setup).to.equal(false);
    });

    it('caches pouchdb instances', () => {
      isOnlineOnly.returns(false);
      Location.dbName = 'medicdb';
      Location.url = 'ftp//myhost:21/medicdb';
      userCtx.returns({ name: 'johnny' });

      // init
      const service = getService();

      expect(pouchDB.callCount).to.equal(2);
      expect(pouchDB.args[0][0]).to.equal('medicdb-user-johnny');
      expect(pouchDB.args[1][0]).to.equal('medicdb-user-johnny-meta');

      // get remote
      const actual1 = service({ remote: true });
      expect(actual1.id).to.equal(expected.id);
      expect(pouchDB.callCount).to.equal(3);

      // get remote again
      const actual2 = service({ remote: true });
      expect(actual2.id).to.equal(expected.id);
      expect(pouchDB.callCount).to.equal(3);
    });

    /**
     * Escape database names when talking to CouchDB.
     * Must be kept in sync with medic-api/lib/userDb.js
     */
    it('escapes invalid database characters - #3778', () => {
      isOnlineOnly.returns(false);
      Location.dbName = 'medicdb';
      Location.url = 'ftp//myhost:21/medicdb';
      userCtx.returns({ name: 'johnny.<>^,?!' });

      // init
      const service = getService();

      expect(pouchDB.callCount).to.equal(2);
      expect(pouchDB.args[0][0]).to.equal('medicdb-user-johnny.<>^,?!');
      expect(pouchDB.args[1][0]).to.equal('medicdb-user-johnny.<>^,?!-meta');

      // get remote
      const actual = service({ remote: true });
      expect(actual.id).to.equal(expected.id);
      expect(pouchDB.callCount).to.equal(3);
      expect(pouchDB.args[2][0]).to.equal('ftp//myhost:21/medicdb');

      // get remote meta
      service({ remote: true, meta: true });
      expect(pouchDB.callCount).to.equal(4);
      expect(pouchDB.args[3][0]).to.equal('ftp//myhost:21/medicdb-user-johnny(46)(60)(62)(94)(44)(63)(33)-meta');
    });
  });

  describe('get local', () => {

    it('sets auto compaction', () => {
      isOnlineOnly.returns(false);
      Location.dbName = 'medicdb';
      userCtx.returns({ name: 'johnny' });

      // init
      const service = getService();

      expect(pouchDB.callCount).to.equal(2);
      expect(expected.viewCleanup.callCount).to.equal(2);

      // get local
      const actual = service();
      expect(pouchDB.callCount).to.equal(2);
      expect(actual.id).to.equal(expected.id);
      expect(pouchDB.args[0][0]).to.equal('medicdb-user-johnny');
      expect(pouchDB.args[0][1].auto_compaction).to.equal(true);
      expect(pouchDB.args[1][0]).to.equal('medicdb-user-johnny-meta');
      expect(pouchDB.args[1][1].auto_compaction).to.equal(true);
      expect(expected.viewCleanup.callCount).to.equal(2);
    });

    it('caches pouchdb instances', () => {
      isOnlineOnly.returns(false);
      Location.dbName = 'medicdb';
      userCtx.returns({ name: 'johnny' });

      // init
      const service = getService();
      expect(pouchDB.callCount).to.equal(2);

      // get local
      const actual1 = service();
      expect(pouchDB.callCount).to.equal(2);
      expect(actual1.id).to.equal(expected.id);

      // get local again
      const actual2 = service();
      expect(pouchDB.callCount).to.equal(2);
      expect(actual2.id).to.equal(expected.id);
      expect(isOnlineOnly.callCount).to.equal(1);
      expect(userCtx.callCount).to.equal(8);
    });

    it('returns remote for admin user', () => {
      isOnlineOnly.returns(true);
      userCtx.returns({ name: 'johnny' });
      Location.url = 'ftp//myhost:21/medicdb';

      // init
      const service = getService();
      expect(pouchDB.callCount).to.equal(0);
      expect(expected.viewCleanup.callCount).to.equal(0);

      // get local returns remote
      const actual = service();
      expect(pouchDB.callCount).to.equal(1);
      expect(actual.id).to.equal(expected.id);
      expect(pouchDB.args[0][0]).to.equal('ftp//myhost:21/medicdb');
      expect(expected.viewCleanup.callCount).to.equal(0);

      // get locale  meta returns remote meta
      service({ meta: true });
      expect(pouchDB.callCount).to.equal(2);
      expect(pouchDB.args[1][0]).to.equal('ftp//myhost:21/medicdb-user-johnny-meta');
    });

    it('emits custom event on local write', done => {
      isOnlineOnly.returns(false);
      userCtx.returns({name: 'foo' });
      Location.dbName = 'localwrite';

      const expectedResult = 'derp';
      const mockPut = sinon.spy(() => expectedResult); 
      expected.put = mockPut;
      pouchDB.returns(expected);
      
      const expectedArg1 = { foo: 'bar' };
      const expectedArg2 = true;
      const expectedArgs = [expectedArg1, expectedArg2];
      rootScope.$on('dbWriteEvent', (e, actual) => {
        expect(actual.args).to.deep.eq(expectedArgs);
        expect(mockPut.callCount).to.eq(0); // put is called after the event
        done();
      });
      const service = getService();
      const db = service({ remote: false, meta: false });
      const actualResult = db.put(expectedArg1, expectedArg2);
      expect(actualResult).to.eq(expectedResult);
      expect(mockPut.args[0]).to.deep.eq(expectedArgs);
    });
  });

});
