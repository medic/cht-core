describe('DBSync service', function() {

  'use strict';

  var service,
      to,
      from,
      query,
      isAdmin,
      userCtx,
      Auth,
      Settings,
      UserDistrict;

  beforeEach(function() {
    to = sinon.stub();
    from = sinon.stub();
    query = sinon.stub();
    isAdmin = sinon.stub();
    userCtx = sinon.stub();
    UserDistrict = sinon.stub();
    Auth = sinon.stub();
    Settings = sinon.stub();
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
      $provide.value('Settings', Settings);
      $provide.value('Auth', Auth);
      $provide.value('UserDistrict', UserDistrict);
    });
    inject(function(_DBSync_) {
      service = _DBSync_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(to, from, query, isAdmin, userCtx, UserDistrict, Auth, Settings);
  });

  it('does nothing for admin', function() {
    isAdmin.returns(true);
    return service(function() { }).then(function() {
      chai.expect(to.callCount).to.equal(0);
      chai.expect(from.callCount).to.equal(0);
    });
  });

  it('initiates sync for non-admin', function() {
    isAdmin.returns(false);
    to.returns(KarmaUtils.mockPromise());
    from.returns(KarmaUtils.mockPromise());
    Auth.returns(KarmaUtils.mockPromise());
    UserDistrict.returns(KarmaUtils.mockPromise(null, 'abc'));
    userCtx.returns({ name: 'mobile', roles: [ 'district-manager' ] });
    Settings.returns({ district_admins_access_unallocated_messages: false });
    query.returns(KarmaUtils.mockPromise(null, { rows: [
      { id: 'm' },
      { id: 'e' },
      { id: 'd' },
      { id: 'i' },
      { id: 'c' }
    ] }));
    return service().then(function() {
      chai.expect(query.callCount).to.equal(1); // 1 'from' calls, 0 'to' calls
      chai.expect(query.args[0][0]).to.equal('medic/doc_by_place');
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
    });
  });

  it('does not sync to remote if user lacks "can_edit" permission', function() {
    isAdmin.returns(false);
    to.returns(KarmaUtils.mockPromise());
    from.returns(KarmaUtils.mockPromise());
    Auth.returns(KarmaUtils.mockPromise('unauthorized'));
    UserDistrict.returns(KarmaUtils.mockPromise(null, 'abc'));
    userCtx.returns({ name: 'mobile', roles: [ 'district-manager' ] });
    Settings.returns({ district_admins_access_unallocated_messages: false });
    query.returns(KarmaUtils.mockPromise(null, { rows: [
      { id: 'm' },
      { id: 'e' },
      { id: 'd' },
      { id: 'i' },
      { id: 'c' }
    ] }));
    return service().then(function() {
      chai.expect(query.callCount).to.equal(1); // 1 'from' calls, 0 'to' calls
      chai.expect(query.args[0][0]).to.equal('medic/doc_by_place');
      chai.expect(query.args[0][1].keys).to.deep.equal([['_all'], ['abc']]);
      chai.expect(Auth.callCount).to.equal(1);
      chai.expect(Auth.args[0][0]).to.equal('can_edit');
      chai.expect(from.callCount).to.equal(1);
      chai.expect(from.args[0][1].live).to.equal(true);
      chai.expect(from.args[0][1].retry).to.equal(true);
      chai.expect(from.args[0][1].doc_ids).to.deep.equal(['m','e','d','i','c','org.couchdb.user:mobile']);
      chai.expect(to.callCount).to.equal(0);
    });
  });

  it('includes _unassigned when configured and allowed', function() {
    isAdmin.returns(false);
    to.returns(KarmaUtils.mockPromise());
    from.returns(KarmaUtils.mockPromise());
    Auth.returns(KarmaUtils.mockPromise());
    UserDistrict.returns(KarmaUtils.mockPromise(null, 'abc'));
    userCtx.returns({ name: 'mobile', roles: [ 'district-manager' ] });
    Settings.returns({ district_admins_access_unallocated_messages: true });
    query.returns(KarmaUtils.mockPromise(null, { rows: [
      { id: 'm' },
      { id: 'e' },
      { id: 'd' },
      { id: 'i' },
      { id: 'c' }
    ] }));
    return service().then(function() {
      chai.expect(query.callCount).to.equal(1); // 1 'from' calls, 0 'to' calls
      chai.expect(query.args[0][0]).to.equal('medic/doc_by_place');
      chai.expect(query.args[0][1].keys).to.deep.equal([['_all'], ['_unassigned'], ['abc']]);
      chai.expect(Auth.callCount).to.equal(2);
      chai.expect(Auth.args[0][0]).to.equal('can_edit');
      chai.expect(Auth.args[1][0]).to.equal('can_view_unallocated_data_records');
    });
  });

  describe('depth configuration', function() {

    it('no facility when user has no role', function() {
      isAdmin.returns(false);
      to.returns(KarmaUtils.mockPromise());
      from.returns(KarmaUtils.mockPromise());
      Auth.returns(KarmaUtils.mockPromise());
      UserDistrict.returns(KarmaUtils.mockPromise(null, 'abc'));
      userCtx.returns({ name: 'mobile' });
      Settings.returns({ district_admins_access_unallocated_messages: false });
      query.returns(KarmaUtils.mockPromise(null, { rows: [
        { id: 'm' },
        { id: 'e' },
        { id: 'd' },
        { id: 'i' },
        { id: 'c' }
      ] }));
      return service().then(function() {
        chai.expect(query.callCount).to.equal(1); // 1 'from' calls, 0 'to' calls
        chai.expect(query.args[0][0]).to.equal('medic/doc_by_place');
        chai.expect(query.args[0][1].keys).to.deep.equal([['_all']]);
      });
    });

    it('no facility when user has no district', function() {
      isAdmin.returns(false);
      to.returns(KarmaUtils.mockPromise());
      from.returns(KarmaUtils.mockPromise());
      Auth.returns(KarmaUtils.mockPromise());
      UserDistrict.returns(KarmaUtils.mockPromise());
      userCtx.returns({ name: 'mobile' });
      Settings.returns({ district_admins_access_unallocated_messages: false });
      query.returns(KarmaUtils.mockPromise(null, { rows: [
        { id: 'm' },
        { id: 'e' },
        { id: 'd' },
        { id: 'i' },
        { id: 'c' }
      ] }));
      return service().then(function() {
        chai.expect(query.callCount).to.equal(1); // 1 'from' calls, 0 'to' calls
        chai.expect(query.args[0][0]).to.equal('medic/doc_by_place');
        chai.expect(query.args[0][1].keys).to.deep.equal([['_all']]);
      });
    });

    it('include depth when configured', function() {
      isAdmin.returns(false);
      to.returns(KarmaUtils.mockPromise());
      from.returns(KarmaUtils.mockPromise());
      Auth.returns(KarmaUtils.mockPromise());
      UserDistrict.returns(KarmaUtils.mockPromise(null, 'abc'));
      userCtx.returns({ name: 'mobile', roles: [ 'district-manager', 'district_admin' ] });
      Settings.returns({
        district_admins_access_unallocated_messages: false,
        replication_depth: [{ role: 'district_admin', depth: 1 }]
      });
      query.returns(KarmaUtils.mockPromise(null, { rows: [
        { id: 'm' },
        { id: 'e' },
        { id: 'd' },
        { id: 'i' },
        { id: 'c' }
      ] }));
      return service().then(function() {
        chai.expect(query.callCount).to.equal(1); // 1 'from' calls, 0 'to' calls
        chai.expect(query.args[0][0]).to.equal('medic/doc_by_place');
        chai.expect(query.args[0][1].keys).to.deep.equal([['_all'], ['abc', 0], ['abc', 1]]);
      });
    });
  });

});

