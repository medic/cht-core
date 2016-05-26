describe('DB service', function() {

  'use strict';

  var service,
      DbNameService,
      userCtx,
      pouchDB,
      location;

  beforeEach(function() {
    DbNameService = sinon.stub();
    userCtx = sinon.stub();
    location = {
      port: 21,
      protocol: 'ftp',
      hostname: 'myhost'
    };
    pouchDB = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('$window', function() {
        return {
          // stub for pouch registering the worker adapter
          PouchDB: { adapter: function(){} },
          location: location
        };
      });
      $provide.factory('DbNameService', function() {
        return DbNameService;
      });
      $provide.factory('pouchDB', function() {
        return pouchDB;
      });
      $provide.factory('Session', function() {
        return { userCtx: userCtx };
      });
    });
    inject(function(_DB_) {
      service = _DB_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(DbNameService, pouchDB, userCtx);
  });

  describe('getRemote function', function() {

    it('sets ajax timeout', function(done) {
      DbNameService.returns('medicdb');
      var expected = 'hello';
      pouchDB.returns(expected);
      var actual = service.getRemote();
      chai.expect(actual).to.equal(expected);
      chai.expect(DbNameService.callCount).to.equal(1);
      chai.expect(pouchDB.callCount).to.equal(1);
      chai.expect(pouchDB.args[0][0]).to.equal('ftp//myhost:21/medicdb');
      chai.expect(pouchDB.args[0][1]).to.deep.equal({ skip_setup: true, ajax: { timeout: 30000 } });
      done();
    });

    it('caches pouchdb instances', function(done) {
      DbNameService.returns('medicdb');
      var expected = 'hello';
      pouchDB.returns(expected);
      var actual1 = service.getRemote();
      var actual2 = service.getRemote();
      chai.expect(actual1).to.equal(expected);
      chai.expect(actual2).to.equal(expected);
      chai.expect(DbNameService.callCount).to.equal(2);
      chai.expect(pouchDB.callCount).to.equal(1);
      done();
    });

    it('uses the name parameter', function(done) {
      DbNameService.returns('medicdb');
      var expected1 = 'hello';
      var expected2 = 'goodbye';
      pouchDB.onCall(0).returns(expected1);
      pouchDB.onCall(1).returns(expected2);
      var actual1 = service.getRemote();
      var actual2 = service.getRemote('auditdb');
      chai.expect(actual1).to.equal(expected1);
      chai.expect(actual2).to.equal(expected2);
      chai.expect(DbNameService.callCount).to.equal(1);
      chai.expect(pouchDB.callCount).to.equal(2);
      chai.expect(pouchDB.args[0][0]).to.equal('ftp//myhost:21/medicdb');
      chai.expect(pouchDB.args[0][1]).to.deep.equal({ skip_setup: true, ajax: { timeout: 30000 } });
      chai.expect(pouchDB.args[1][0]).to.equal('ftp//myhost:21/auditdb');
      chai.expect(pouchDB.args[1][1]).to.deep.equal({ skip_setup: true, ajax: { timeout: 30000 } });
      done();
    });

  });

  describe('get function', function() {

    it('sets ajax timeout', function(done) {
      DbNameService.returns('medicdb');
      userCtx.returns({ name: 'johnny' });
      var expected = 'hello';
      pouchDB.returns(expected);
      var actual = service.get();
      chai.expect(actual).to.equal(expected);
      chai.expect(DbNameService.callCount).to.equal(1);
      chai.expect(pouchDB.callCount).to.equal(1);
      chai.expect(pouchDB.args[0][0]).to.equal('medicdb-user-johnny');
      // TODO reenable
      // chai.expect(pouchDB.args[0][1]).to.deep.equal({ adapter: 'worker', auto_compaction: true });
      done();
    });

    it('caches pouchdb instances', function(done) {
      DbNameService.returns('medicdb');
      userCtx.returns({ name: 'johnny' });
      var expected = 'hello';
      pouchDB.returns(expected);
      var actual1 = service.get();
      var actual2 = service.get();
      chai.expect(actual1).to.equal(expected);
      chai.expect(actual2).to.equal(expected);
      chai.expect(DbNameService.callCount).to.equal(2);
      // twice to check if admin, twice to get user name
      chai.expect(userCtx.callCount).to.equal(4);
      chai.expect(pouchDB.callCount).to.equal(1);
      done();
    });

    it('uses the name parameter', function(done) {
      DbNameService.returns('medicdb');
      userCtx.returns({ name: 'johnny' });
      var expected1 = 'hello';
      var expected2 = 'goodbye';
      pouchDB.onCall(0).returns(expected1);
      pouchDB.onCall(1).returns(expected2);
      var actual1 = service.get();
      var actual2 = service.get('auditdb');
      chai.expect(actual1).to.equal(expected1);
      chai.expect(actual2).to.equal(expected2);
      chai.expect(DbNameService.callCount).to.equal(1);
      chai.expect(pouchDB.callCount).to.equal(2);
      // TODO reenable
      // chai.expect(pouchDB.args[0][0]).to.equal('medicdb-user-johnny');
      // chai.expect(pouchDB.args[0][1]).to.deep.equal({ adapter: 'worker', auto_compaction: true });
      // chai.expect(pouchDB.args[1][0]).to.equal('auditdb-user-johnny');
      // chai.expect(pouchDB.args[1][1]).to.deep.equal({ adapter: 'worker', auto_compaction: true });
      done();
    });

  });

});
