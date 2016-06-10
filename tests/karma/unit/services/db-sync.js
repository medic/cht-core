describe('DBSync service', function() {

  'use strict';

  var service,
      to,
      from,
      query,
      getRemote,
      isAdmin,
      userCtx,
      UserDistrict;

  beforeEach(function() {
    to = sinon.stub();
    from = sinon.stub();
    query = sinon.stub();
    getRemote = sinon.stub();
    isAdmin = sinon.stub();
    userCtx = sinon.stub();
    UserDistrict = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB(
        {
          replicate: { to: to, from: from },
          query: query
        },
        getRemote
      ));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('Session', {
        isAdmin: isAdmin,
        userCtx: userCtx
      } );
      $provide.value('Settings', function() {
        return { district_admins_access_unallocated_messages: false };
      });
      $provide.value('UserDistrict', UserDistrict);
    });
    inject(function(_DBSync_) {
      service = _DBSync_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(to, from, query, getRemote, isAdmin, userCtx, UserDistrict);
  });

  it('does nothing for admin', function(done) {
    isAdmin.returns(true);
    service(function() { });
    setTimeout(function() {
      chai.expect(to.callCount).to.equal(0);
      chai.expect(from.callCount).to.equal(0);
      done();
    });
  });

  it('initiates sync for non-admin', function(done) {
    isAdmin.returns(false);
    getRemote.returns('REMOTEDB');
    to.returns(KarmaUtils.mockPromise());
    from.returns(KarmaUtils.mockPromise());
    UserDistrict.returns(KarmaUtils.mockPromise(null, 'abc'));
    userCtx.returns({ name: 'mobile' });
    query.returns(KarmaUtils.mockPromise(null, { rows: [
      { id: 'm' },
      { id: 'e' },
      { id: 'd' },
      { id: 'i' },
      { id: 'c' }
    ] }));
    service(function() { });
    setTimeout(function() {
      chai.expect(query.callCount).to.equal(2); // 2 'from' calls, 0 'to' calls
      chai.expect(query.args[0][0]).to.equal('medic/doc_by_place');
      chai.expect(query.args[0][1].keys).to.deep.equal([['_all'], ['abc']]);
      chai.expect(from.callCount).to.equal(2); // initial sync then continuous
      chai.expect(from.args[0][0]).to.equal('REMOTEDB');
      chai.expect(from.args[0][1].live).to.equal(false);
      chai.expect(from.args[0][1].retry).to.equal(false);
      chai.expect(from.args[0][1].doc_ids).to.deep.equal(['m','e','d','i','c','mobile']);
      chai.expect(from.args[1][0]).to.equal('REMOTEDB');
      chai.expect(from.args[1][1].live).to.equal(true);
      chai.expect(from.args[1][1].retry).to.equal(true);
      chai.expect(from.args[1][1].doc_ids).to.deep.equal(['m','e','d','i','c','mobile']);
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
