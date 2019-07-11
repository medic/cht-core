describe('UserSettings service', () => {

  'use strict';

  let service;
  let get;
  let userCtx;
  let changesCallback;

  beforeEach(() => {
    module('inboxApp');
    userCtx = sinon.stub();
    get = sinon.stub();
    module($provide => {
      $provide.value('Changes', options => {
        changesCallback = options.callback;
      });
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('Session', { userCtx: userCtx });
      $provide.factory('DB', KarmaUtils.mockDB({ get }));
    });
    inject(_UserSettings_ => {
      service = _UserSettings_;
    });
  });

  afterEach(() => {
    KarmaUtils.restore(userCtx, get);
  });

  it('errors when no user ctx', done => {
    userCtx.returns();
    service()
      .then(() => {
        done(new Error('expected error to be thrown'));
      })
      .catch(err => {
        chai.expect(err.message).to.equal('UserCtx not found');
        done();
      });
  });

  it('gets from local db', () => {
    userCtx.returns({ name: 'jack' });
    get.returns(Promise.resolve({ id: 'j' }));
    return service().then(actual => {
      chai.expect(actual.id).to.equal('j');
      chai.expect(userCtx.callCount).to.equal(2);
      chai.expect(get.callCount).to.equal(1);
      chai.expect(get.args[0][0]).to.equal('org.couchdb.user:jack');
    });
  });

  it('is cached', () => {
    userCtx.returns({ name: 'jack' });
    get.returns(Promise.resolve({ id: 'j' }));
    return service()
      .then(first => {
        chai.expect(first.id).to.equal('j');
        chai.expect(get.callCount).to.equal(1);
        return service();
      })
      .then(second => {
        chai.expect(second.id).to.equal('j');
        chai.expect(get.callCount).to.equal(1);
      });
  });

  it('is not cached when changes occur', () => {
    userCtx.returns({ name: 'jack' });
    get.returns(Promise.resolve({ id: 'j' }));
    return service()
      .then(first => {
        chai.expect(first.id).to.equal('j');
        chai.expect(get.callCount).to.equal(1);
        changesCallback({ id: 'org.couchdb.user:jack', changes: [ { rev: '5-xyz' } ] });
        return service();
      })
      .then(second => {
        chai.expect(second.id).to.equal('j');
        chai.expect(get.callCount).to.equal(2);
      });
  });

  it('multiple concurrent calls result in single database lookup', () => {
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
  });

  it('gets from remote db', () => {
    userCtx.returns({ name: 'jack' });
    get
      .onCall(0).returns(Promise.reject({ code: 404 }))
      .onCall(1).returns(Promise.resolve({ id: 'j' }));
    return service().then(actual => {
      chai.expect(actual.id).to.equal('j');
      chai.expect(userCtx.callCount).to.equal(2);
      chai.expect(get.callCount).to.equal(2);
      chai.expect(get.args[0][0]).to.equal('org.couchdb.user:jack');
      chai.expect(get.args[1][0]).to.equal('org.couchdb.user:jack');
    });
  });

  it('errors if remote db errors', done => {
    userCtx.returns({ name: 'jack' });
    get
      .onCall(0).returns(Promise.reject({ code: 404 }))
      .onCall(1).returns(Promise.reject({ code: 503, message: 'nope' }));
    service()
      .then(() => {
        done(new Error('expected error to be thrown'));
      })
      .catch(err => {
        chai.expect(userCtx.callCount).to.equal(2);
        chai.expect(get.callCount).to.equal(2);
        chai.expect(get.args[0][0]).to.equal('org.couchdb.user:jack');
        chai.expect(get.args[1][0]).to.equal('org.couchdb.user:jack');
        chai.expect(err.message).to.equal('nope');
        done();
      })
      .catch(done);
  });

});
