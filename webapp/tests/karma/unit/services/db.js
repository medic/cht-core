describe('DB service', () => {

  'use strict';

  let getService,
      Location,
      userCtx,
      pouchDB,
      expected,
      isAdmin;

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

    isAdmin = sinon.stub();
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
        isAdmin: isAdmin
      } );
      $provide.value('Location', Location);
    });
    inject($injector => {
      getService = () => {
        // delay initialisation of the db service
        return $injector.get('DB');
      };
    });
  });

  afterEach(() => {
    KarmaUtils.restore(pouchDB, userCtx, isAdmin);
  });

  describe('get remote', () => {

    it('sets ajax timeout', () => {
      isAdmin.returns(false);
      Location.dbName = 'medicdb';
      Location.url = 'ftp//myhost:21/medicdb';
      userCtx.returns({ name: 'johnny' });

      // init
      const service = getService();
      chai.expect(pouchDB.callCount).to.equal(2);
      chai.expect(pouchDB.args[0][0]).to.equal('medicdb-user-johnny');
      chai.expect(pouchDB.args[1][0]).to.equal('medicdb-user-johnny-meta');

      // get remote
      const actual = service({ remote: true });
      chai.expect(actual.id).to.equal(expected.id);
      chai.expect(pouchDB.callCount).to.equal(3);
      chai.expect(pouchDB.args[2][0]).to.equal('ftp//myhost:21/medicdb');
      chai.expect(pouchDB.args[2][1]).to.deep.equal({ skip_setup: true, ajax: { timeout: 30000 } });

      // get remote meta
      service({ remote: true, meta: true });
      chai.expect(pouchDB.callCount).to.equal(4);
      chai.expect(pouchDB.args[3][0]).to.equal('ftp//myhost:21/medicdb-user-johnny-meta');
      chai.expect(pouchDB.args[3][1]).to.deep.equal({ skip_setup: false, ajax: { timeout: 30000 } });
    });

    it('caches pouchdb instances', () => {
      isAdmin.returns(false);
      Location.dbName = 'medicdb';
      Location.url = 'ftp//myhost:21/medicdb';
      userCtx.returns({ name: 'johnny' });

      // init
      const service = getService();
      chai.expect(pouchDB.callCount).to.equal(2);
      chai.expect(pouchDB.args[0][0]).to.equal('medicdb-user-johnny');
      chai.expect(pouchDB.args[1][0]).to.equal('medicdb-user-johnny-meta');

      // get remote
      const actual1 = service({ remote: true });
      chai.expect(actual1.id).to.equal(expected.id);
      chai.expect(pouchDB.callCount).to.equal(3);

      // get remote again
      const actual2 = service({ remote: true });
      chai.expect(actual2.id).to.equal(expected.id);
      chai.expect(pouchDB.callCount).to.equal(3);
    });

    /**
     * Escape database names when talking to CouchDB.
     * Must be kept in sync with medic-api/lib/userDb.js
     */
    it('escapes invalid database characters - #3778', () => {
      isAdmin.returns(false);
      Location.dbName = 'medicdb';
      Location.url = 'ftp//myhost:21/medicdb';
      userCtx.returns({ name: 'johnny.<>^,?!' });

      // init
      const service = getService();
      chai.expect(pouchDB.callCount).to.equal(2);
      chai.expect(pouchDB.args[0][0]).to.equal('medicdb-user-johnny.<>^,?!');
      chai.expect(pouchDB.args[1][0]).to.equal('medicdb-user-johnny.<>^,?!-meta');

      // get remote
      const actual = service({ remote: true });
      chai.expect(actual.id).to.equal(expected.id);
      chai.expect(pouchDB.callCount).to.equal(3);
      chai.expect(pouchDB.args[2][0]).to.equal('ftp//myhost:21/medicdb');
      chai.expect(pouchDB.args[2][1]).to.deep.equal({ skip_setup: true, ajax: { timeout: 30000 } });

      // get remote meta
      service({ remote: true, meta: true });
      chai.expect(pouchDB.callCount).to.equal(4);
      chai.expect(pouchDB.args[3][0]).to.equal('ftp//myhost:21/medicdb-user-johnny(46)(60)(62)(94)(44)(63)(33)-meta');
      chai.expect(pouchDB.args[3][1]).to.deep.equal({ skip_setup: false, ajax: { timeout: 30000 } });
    });
  });

  describe('get local', () => {

    it('sets ajax timeout', () => {
      isAdmin.returns(false);
      Location.dbName = 'medicdb';
      userCtx.returns({ name: 'johnny' });

      // init
      const service = getService();
      chai.expect(pouchDB.callCount).to.equal(2);
      chai.expect(expected.viewCleanup.callCount).to.equal(2);

      // get local
      const actual = service();
      chai.expect(pouchDB.callCount).to.equal(2);
      chai.expect(actual.id).to.equal(expected.id);
      chai.expect(pouchDB.args[0][0]).to.equal('medicdb-user-johnny');
      chai.expect(pouchDB.args[0][1].auto_compaction).to.equal(true);
      chai.expect(pouchDB.args[1][0]).to.equal('medicdb-user-johnny-meta');
      chai.expect(pouchDB.args[1][1].auto_compaction).to.equal(true);
      chai.expect(expected.viewCleanup.callCount).to.equal(2);
    });

    it('caches pouchdb instances', () => {
      isAdmin.returns(false);
      Location.dbName = 'medicdb';
      userCtx.returns({ name: 'johnny' });

      // init
      const service = getService();
      chai.expect(pouchDB.callCount).to.equal(2);

      // get local
      const actual1 = service();
      chai.expect(pouchDB.callCount).to.equal(2);
      chai.expect(actual1.id).to.equal(expected.id);

      // get local again
      const actual2 = service();
      chai.expect(pouchDB.callCount).to.equal(2);
      chai.expect(actual2.id).to.equal(expected.id);
      chai.expect(isAdmin.callCount).to.equal(5);
      chai.expect(userCtx.callCount).to.equal(8);
    });

    it('returns remote for admin user', () => {
      isAdmin.returns(true);
      userCtx.returns({ name: 'johnny' });
      Location.url = 'ftp//myhost:21/medicdb';

      // init
      const service = getService();
      chai.expect(pouchDB.callCount).to.equal(0);
      chai.expect(expected.viewCleanup.callCount).to.equal(0);

      // get local returns remote
      const actual = service();
      chai.expect(pouchDB.callCount).to.equal(1);
      chai.expect(actual.id).to.equal(expected.id);
      chai.expect(pouchDB.args[0][0]).to.equal('ftp//myhost:21/medicdb');
      chai.expect(pouchDB.args[0][1]).to.deep.equal({ skip_setup: true, ajax: { timeout: 30000 } });
      chai.expect(expected.viewCleanup.callCount).to.equal(0);

      // get locale  meta returns remote meta
      service({ meta: true });
      chai.expect(pouchDB.callCount).to.equal(2);
      chai.expect(pouchDB.args[1][0]).to.equal('ftp//myhost:21/medicdb-user-johnny-meta');
      chai.expect(pouchDB.args[1][1]).to.deep.equal({ skip_setup: false, ajax: { timeout: 30000 } });
    });

  });

});
