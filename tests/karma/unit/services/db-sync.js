describe('DBSync service', function() {

  'use strict';

  var service,
      to,
      from,
      query,
      isAdmin,
      userCtx,
      Auth,
      UserDistrict;

  beforeEach(function() {
    to = sinon.stub();
    from = sinon.stub();
    query = sinon.stub();
    isAdmin = sinon.stub();
    userCtx = sinon.stub();
    UserDistrict = sinon.stub();
    Auth = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({
        replicate: { to: to, from: from },
        query: query
      }));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('Session', {
        isAdmin: isAdmin,
        userCtx: userCtx
      } );
      $provide.value('Settings', function() {
        return { district_admins_access_unallocated_messages: false };
      });
      $provide.value('Auth', Auth);
      $provide.value('UserDistrict', UserDistrict);
    });
    inject(function(_DBSync_) {
      service = _DBSync_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(to, from, query, isAdmin, userCtx, UserDistrict, Auth);
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
    to.returns(KarmaUtils.mockPromise());
    from.returns(KarmaUtils.mockPromise());
    Auth.returns(KarmaUtils.mockPromise());
    UserDistrict.returns(KarmaUtils.mockPromise(null, 'abc'));
    userCtx.returns({ name: 'mobile' });
    query.returns(KarmaUtils.mockPromise(null, { rows: [
      { id: 'm' },
      { id: 'e' },
      { id: 'd' },
      { id: 'i' },
      { id: 'c' }
    ] }));
    service();
    setTimeout(function() {
      chai.expect(query.callCount).to.equal(1); // 1 'from' calls, 0 'to' calls
      chai.expect(query.args[0][0]).to.equal('medic-client/doc_by_place');
      chai.expect(query.args[0][1].keys).to.deep.equal([['_all'], ['abc']]);
      chai.expect(Auth.callCount).to.equal(1);
      chai.expect(Auth.args[0][0]).to.equal('can_edit');
      chai.expect(from.callCount).to.equal(1);
      chai.expect(from.args[0][1].live).to.equal(true);
      chai.expect(from.args[0][1].retry).to.equal(true);
      chai.expect(from.args[0][1].doc_ids).to.deep.equal(['m','e','d','i','c','org.couchdb.user:mobile']);
      chai.expect(to.callCount).to.equal(1);
      chai.expect(to.args[0][1].live).to.equal(true);
      chai.expect(to.args[0][1].retry).to.equal(true);
      var backoff = to.args[0][1].back_off_function;
      chai.expect(backoff(0)).to.equal(1000);
      chai.expect(backoff(2000)).to.equal(4000);
      chai.expect(backoff(31000)).to.equal(60000);
      done();
    });
  });

  it('does not sync to remote if user lacks "can_edit" permission', function(done) {
    isAdmin.returns(false);
    to.returns(KarmaUtils.mockPromise());
    from.returns(KarmaUtils.mockPromise());
    Auth.returns(KarmaUtils.mockPromise('unauthorized'));
    UserDistrict.returns(KarmaUtils.mockPromise(null, 'abc'));
    userCtx.returns({ name: 'mobile' });
    query.returns(KarmaUtils.mockPromise(null, { rows: [
      { id: 'm' },
      { id: 'e' },
      { id: 'd' },
      { id: 'i' },
      { id: 'c' }
    ] }));
    service();
    setTimeout(function() {
      chai.expect(query.callCount).to.equal(1); // 1 'from' calls, 0 'to' calls
      chai.expect(query.args[0][0]).to.equal('medic-client/doc_by_place');
      chai.expect(query.args[0][1].keys).to.deep.equal([['_all'], ['abc']]);
      chai.expect(Auth.callCount).to.equal(1);
      chai.expect(Auth.args[0][0]).to.equal('can_edit');
      chai.expect(from.callCount).to.equal(1);
      chai.expect(from.args[0][1].live).to.equal(true);
      chai.expect(from.args[0][1].retry).to.equal(true);
      chai.expect(from.args[0][1].doc_ids).to.deep.equal(['m','e','d','i','c','org.couchdb.user:mobile']);
      chai.expect(to.callCount).to.equal(0);
      done();
    });
  });

});
