describe('DBSync service', function() {

  'use strict';

  var service,
      to,
      from,
      getRemoteUrl,
      UserDistrict,
      Settings,
      userCtx;

  beforeEach(function() {
    to = sinon.stub();
    from = sinon.stub();
    UserDistrict = sinon.stub();
    getRemoteUrl = sinon.stub();
    Settings = sinon.stub();
    userCtx = {};
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB(
        { replicate: { to: to, from: from } },
        getRemoteUrl
      ));
      $provide.factory('UserDistrict', function() {
        return UserDistrict;
      });
      $provide.factory('Settings', function() {
        return Settings;
      });
      $provide.factory('UserCtxService', function() {
        return function() {
          return userCtx;
        };
      });
    });
    inject(function(_DBSync_) {
      service = _DBSync_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(to, from, getRemoteUrl, UserDistrict, Settings);
  });

  it('does nothing for admin', function(done) {
    userCtx = { roles: [ '_admin' ] };
    service();
    chai.expect(to.callCount).to.equal(0);
    chai.expect(from.callCount).to.equal(0);
    chai.expect(UserDistrict.callCount).to.equal(0);
    done();
  });

  it('initiates sync for non-admin', function(done) {
    userCtx = { };
    getRemoteUrl.returns('REMOTEDBURL');
    to.returns(KarmaUtils.mockPromise());
    from.returns(KarmaUtils.mockPromise());
    UserDistrict.callsArgWith(0, null, 'a');
    Settings.callsArgWith(0, null, {});
    service();
    chai.expect(to.callCount).to.equal(1);
    chai.expect(from.callCount).to.equal(1);
    chai.expect(UserDistrict.callCount).to.equal(1);
    chai.expect(to.args[0][0]).to.equal('REMOTEDBURL');
    chai.expect(to.args[0][1].live).to.equal(true);
    chai.expect(to.args[0][1].retry).to.equal(true);
    chai.expect(from.args[0][0]).to.equal('REMOTEDBURL');
    chai.expect(from.args[0][1].live).to.equal(true);
    chai.expect(from.args[0][1].retry).to.equal(true);
    chai.expect(from.args[0][1].filter).to.equal('medic/doc_by_place');
    chai.expect(from.args[0][1].query_params.id).to.equal('a');
    chai.expect(from.args[0][1].query_params.unassigned).to.equal(undefined);
    var backoff = to.args[0][1].back_off_function;
    chai.expect(backoff(0)).to.equal(1000);
    chai.expect(backoff(2000)).to.equal(4000);
    chai.expect(backoff(31000)).to.equal(60000);
    done();
  });

  it('requests unassigned docs if setting set and district admin', function(done) {
    userCtx = { roles: [ 'district_admin' ] };
    getRemoteUrl.returns('REMOTEDBURL');
    to.returns(KarmaUtils.mockPromise());
    from.returns(KarmaUtils.mockPromise());
    UserDistrict.callsArgWith(0, null, 'a');
    Settings.callsArgWith(0, null, { district_admins_access_unallocated_messages: true });
    service();
    chai.expect(from.args[0][1].query_params.unassigned).to.equal(true);
    done();
  });

  it('does not request unassigned docs if setting set and not district admin', function(done) {
    userCtx = { };
    getRemoteUrl.returns('REMOTEDBURL');
    to.returns(KarmaUtils.mockPromise());
    from.returns(KarmaUtils.mockPromise());
    UserDistrict.callsArgWith(0, null, 'a');
    Settings.callsArgWith(0, null, { district_admins_access_unallocated_messages: true });
    service();
    chai.expect(from.args[0][1].query_params.unassigned).to.equal(undefined);
    done();
  });

});
