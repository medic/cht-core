describe('DB service', function() {

  'use strict';

  var service,
      Location,
      userCtx,
      pouchDB;

  beforeEach(function() {
    Location = {};
    userCtx = sinon.stub();
    pouchDB = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('$window', function() {
        return {
          // stub for pouch registering the worker adapter
          PouchDB: { adapter: function(){} }
        };
      });
      $provide.factory('pouchDB', function() {
        return pouchDB;
      });
      $provide.factory('Session', function() {
        return { userCtx: userCtx };
      });
      $provide.value('Location', Location);
    });
    inject(function(_DB_) {
      service = _DB_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(pouchDB, userCtx);
  });

  describe('getRemote function', function() {

    it('sets ajax timeout', function(done) {
      Location.url = 'ftp//myhost:21/medicdb';
      var expected = 'hello';
      pouchDB.returns(expected);
      var actual = service.getRemote();
      chai.expect(actual).to.equal(expected);
      chai.expect(pouchDB.callCount).to.equal(1);
      chai.expect(pouchDB.args[0][0]).to.equal('ftp//myhost:21/medicdb');
      chai.expect(pouchDB.args[0][1]).to.deep.equal({ skip_setup: true, ajax: { timeout: 30000 } });
      done();
    });

    it('caches pouchdb instances', function(done) {
      Location.url = 'ftp//myhost:21/medicdb';
      var expected = 'hello';
      pouchDB.returns(expected);
      var actual1 = service.getRemote();
      var actual2 = service.getRemote();
      chai.expect(actual1).to.equal(expected);
      chai.expect(actual2).to.equal(expected);
      chai.expect(pouchDB.callCount).to.equal(1);
      done();
    });

  });

  describe('get function', function() {

    it('sets ajax timeout', function(done) {
      Location.dbName = 'medicdb';
      userCtx.returns({ name: 'johnny' });
      var expected = 'hello';
      pouchDB.returns(expected);
      var actual = service.get();
      chai.expect(actual).to.equal(expected);
      chai.expect(pouchDB.callCount).to.equal(1);
      chai.expect(pouchDB.args[0][0]).to.equal('medicdb-user-johnny');
      chai.expect(pouchDB.args[0][1].adapter).to.equal('worker');
      chai.expect(pouchDB.args[0][1].auto_compaction).to.equal(true);
      done();
    });

    it('caches pouchdb instances', function(done) {
      Location.dbName = 'medicdb';
      userCtx.returns({ name: 'johnny' });
      var expected = 'hello';
      pouchDB.returns(expected);
      var actual1 = service.get();
      var actual2 = service.get();
      chai.expect(actual1).to.equal(expected);
      chai.expect(actual2).to.equal(expected);
      // twice to check if admin, twice to get user name
      chai.expect(userCtx.callCount).to.equal(4);
      chai.expect(pouchDB.callCount).to.equal(1);
      done();
    });

  });

});
