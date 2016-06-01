describe('DBSync service', function() {

  'use strict';

  var service,
      to,
      from,
      getRemote,
      userCtx,
      $rootScope;

  beforeEach(function() {
    to = sinon.stub();
    from = sinon.stub();
    getRemote = sinon.stub();
    userCtx = {};
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB(
        { replicate: { to: to, from: from } },
        getRemote
      ));
      $provide.factory('Session', function() {
        return {
          userCtx: function() {
            return userCtx;
          }
        };
      });
    });
    inject(function(_DBSync_, _$rootScope_) {
      service = _DBSync_;
      $rootScope = _$rootScope_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(to, from, getRemote);
  });

  it('does nothing for admin', function(done) {
    userCtx = { roles: [ '_admin' ] };
    service(function() { });
    setTimeout(function() {
      $rootScope.$apply(); // needed to resolve the promises
      chai.expect(to.callCount).to.equal(0);
      chai.expect(from.callCount).to.equal(0);
      done();
    });
  });

  it('initiates sync for non-admin', function(done) {
    userCtx = { };
    getRemote.returns('REMOTEDB');
    to.returns(KarmaUtils.mockPromise());
    from.returns(KarmaUtils.mockPromise());
    service(function() { });
    setTimeout(function() {
      $rootScope.$apply(); // needed to resolve the promises
      chai.expect(from.callCount).to.equal(2); // initial sync then continuous
      chai.expect(from.args[0][0]).to.equal('REMOTEDB');
      chai.expect(from.args[0][1].live).to.equal(false);
      chai.expect(from.args[0][1].retry).to.equal(false);
      chai.expect(from.args[1][0]).to.equal('REMOTEDB');
      chai.expect(from.args[1][1].live).to.equal(true);
      chai.expect(from.args[1][1].retry).to.equal(true);
      chai.expect(to.callCount).to.equal(1);
      chai.expect(to.args[0][0]).to.equal('REMOTEDB');
      chai.expect(to.args[0][1].live).to.equal(true);
      chai.expect(to.args[0][1].retry).to.equal(true);
      var backoff = to.args[0][1].back_off_function;
      chai.expect(backoff(0)).to.equal(1000);
      chai.expect(backoff(2000)).to.equal(4000);
      chai.expect(backoff(31000)).to.equal(60000);
      done();
    });
  });

});
