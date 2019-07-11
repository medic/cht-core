describe('UserSettings service', function() {

  'use strict';

  var service,
      get,
      userCtx,
      $rootScope,
      changesCallback;

  beforeEach(function() {
    module('inboxApp');
    userCtx = sinon.stub();
    get = sinon.stub();
    module(function ($provide) {
      $provide.value('Changes', function(options) {
        changesCallback = options.callback;
      });
      $provide.value('Session', { userCtx: userCtx });
      $provide.factory('DB', KarmaUtils.mockDB({ get }));
    });
    inject(function(_UserSettings_, _$rootScope_) {
      service = _UserSettings_;
      $rootScope = _$rootScope_;
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
    setTimeout(function() {
      $rootScope.$digest(); // needed to resolve the promise
    });
  });

  it('gets from local db', function(done) {
    userCtx.returns({ name: 'jack' });
    get.returns(Promise.resolve({ id: 'j' }));
    service()
      .then(function(actual) {
        chai.expect(actual.id).to.equal('j');
        chai.expect(userCtx.callCount).to.equal(2);
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.args[0][0]).to.equal('org.couchdb.user:jack');
        done();
      })
      .catch(done);
    setTimeout(function() {
      $rootScope.$digest(); // needed to resolve the promise
    });  
  });

  it('is cached', function(done) {
    userCtx.returns({ name: 'jack' });
    get.returns(Promise.resolve({ id: 'j' }));
    service()
      .then(first => {
        chai.expect(first.id).to.equal('j');
        chai.expect(get.callCount).to.equal(1);
        return service();
      })
      .then(second => {
        chai.expect(second.id).to.equal('j');
        chai.expect(get.callCount).to.equal(1);
        done();
      })
      .catch(done);
    setTimeout(function() {
      $rootScope.$digest(); // needed to resolve the promise
    }); 
    setTimeout(function() {
      $rootScope.$digest(); // needed to resolve the promise
    }); 
  });

  it('is not cached when changes occur', function(done) {
    userCtx.returns({ name: 'jack' });
    get.returns(Promise.resolve({ id: 'j' }));
    service()
      .then(first => {
        chai.expect(first.id).to.equal('j');
        chai.expect(get.callCount).to.equal(1);

        changesCallback({ id: 'org.couchdb.user:jack', changes: [ { rev: '5-xyz' } ] });

        return service();
      })
      .then(second => {
        chai.expect(second.id).to.equal('j');
        chai.expect(get.callCount).to.equal(2);
        done();
      })
      .catch(done);
    setTimeout(function() {
      $rootScope.$digest(); // needed to resolve the promise
    }); 
    setTimeout(function() {
      $rootScope.$digest(); // needed to resolve the promise
    }); 
  });

  it('multiple concurrent calls result in single database lookup', function() {
    userCtx.returns({ name: 'jack' });
    get.returns(Promise.resolve({ id: 'j' }));
    const isExpected = doc => {
      chai.expect(doc.id).to.equal('j');
      chai.expect(get.callCount).to.equal(1);
    };

    const firstPromise = service();
    service();
    service().then(isExpected);
    firstPromise.then(isExpected);
    setTimeout(function() {
      $rootScope.$digest(); // needed to resolve the promise
    }); 
  });

  it('gets from remote db', function(done) {
    userCtx.returns({ name: 'jack' });
    get
      .onCall(0).returns(Promise.reject({ code: 404 }))
      .onCall(1).returns(Promise.resolve({ id: 'j' }));
    service()
      .then(function(actual) {
        chai.expect(actual.id).to.equal('j');
        chai.expect(userCtx.callCount).to.equal(2);
        chai.expect(get.callCount).to.equal(2);
        chai.expect(get.args[0][0]).to.equal('org.couchdb.user:jack');
        chai.expect(get.args[1][0]).to.equal('org.couchdb.user:jack');
        done();
      })
      .catch(done);
    setTimeout(function() {
      $rootScope.$digest(); // needed to resolve the promise
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
        chai.expect(userCtx.callCount).to.equal(2);
        chai.expect(get.callCount).to.equal(2);
        chai.expect(get.args[0][0]).to.equal('org.couchdb.user:jack');
        chai.expect(get.args[1][0]).to.equal('org.couchdb.user:jack');
        chai.expect(err.message).to.equal('nope');
        done();
      })
      .catch(done);
    setTimeout(function() {
      $rootScope.$digest(); // needed to resolve the promise
    }); 
  });

});
