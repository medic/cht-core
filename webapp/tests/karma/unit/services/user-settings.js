describe('UserSettings service', function() {

  'use strict';

  var service,
      get,
      userCtx;

  beforeEach(function() {
    module('inboxApp');
    userCtx = sinon.stub();
    get = sinon.stub();
    module(function ($provide) {
      $provide.value('Session', { userCtx: userCtx });
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.factory('DB', KarmaUtils.mockDB({
        get: get
      }));
    });
    inject(function($injector) {
      service = $injector.get('UserSettings');
    });
  });

  afterEach(function() {
    KarmaUtils.restore(userCtx, get);
  });

  it('errors when no user ctx', function(done) {
    userCtx.returns();
    service()
      .then(function() {
        done(new Error('expected error to be thrown'));
      })
      .catch(function(err) {
        chai.expect(err.message).to.equal('UserCtx not found');
        done();
      });
  });

  it('gets from local db', function() {
    userCtx.returns({ name: 'jack' });
    get.returns(Promise.resolve({ id: 'j' }));
    return service()
      .then(function(actual) {
        chai.expect(actual.id).to.equal('j');
        chai.expect(userCtx.callCount).to.equal(1);
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.args[0][0]).to.equal('org.couchdb.user:jack');
      });
  });

  it('gets from remote db', function() {
    userCtx.returns({ name: 'jack' });
    get
      .onCall(0).returns(Promise.reject({ code: 404 }))
      .onCall(1).returns(Promise.resolve({ id: 'j' }));
    return service()
      .then(function(actual) {
        chai.expect(actual.id).to.equal('j');
        chai.expect(userCtx.callCount).to.equal(1);
        chai.expect(get.callCount).to.equal(2);
        chai.expect(get.args[0][0]).to.equal('org.couchdb.user:jack');
        chai.expect(get.args[1][0]).to.equal('org.couchdb.user:jack');
      });
  });

  it('errors if remote db errors', function(done) {
    userCtx.returns({ name: 'jack' });
    get
      .onCall(0).returns(Promise.reject({ code: 404 }))
      .onCall(1).returns(Promise.reject({ code: 503, message: 'nope' }));
    service()
      .then(function() {
        done(new Error('expected error to be thrown'));
      })
      .catch(function(err) {
        chai.expect(userCtx.callCount).to.equal(1);
        chai.expect(get.callCount).to.equal(2);
        chai.expect(get.args[0][0]).to.equal('org.couchdb.user:jack');
        chai.expect(get.args[1][0]).to.equal('org.couchdb.user:jack');
        chai.expect(err.message).to.equal('nope');
        done();
      });
  });

});
