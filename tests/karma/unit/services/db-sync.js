describe('DBSync service', function() {

  'use strict';

  var service,
      to,
      from,
      query,
      allDocs,
      isAdmin,
      userCtx,
      Auth;

  beforeEach(function() {
    to = sinon.stub();
    from = sinon.stub();
    query = sinon.stub();
    allDocs = sinon.stub();
    isAdmin = sinon.stub();
    userCtx = sinon.stub();
    Auth = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({
        replicate: { to: to, from: from },
        allDocs: allDocs
      }));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('Session', {
        isAdmin: isAdmin,
        userCtx: userCtx
      } );
      $provide.value('Auth', Auth);
    });
    inject(function(_DBSync_) {
      service = _DBSync_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(to, from, query, allDocs, isAdmin, userCtx, Auth);
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
    userCtx.returns({ name: 'mobile', roles: [ 'district-manager' ] });
    allDocs.returns(KarmaUtils.mockPromise(null, { rows: [
      { id: 'm' },
      { id: 'e' },
      { id: 'd' },
      { id: 'i' },
      { id: 'c' }
    ] }));
    return service().then(function() {
      chai.expect(allDocs.callCount).to.equal(1); // 1 'from' calls, 0 'to' calls
      chai.expect(Auth.callCount).to.equal(1);
      chai.expect(Auth.args[0][0]).to.equal('can_edit');
      chai.expect(from.callCount).to.equal(1);
      chai.expect(from.args[0][1].live).to.equal(true);
      chai.expect(from.args[0][1].retry).to.equal(true);
      chai.expect(from.args[0][1].doc_ids).to.deep.equal(['m','e','d','i','c']);
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
    userCtx.returns({ name: 'mobile', roles: [ 'district-manager' ] });
    allDocs.returns(KarmaUtils.mockPromise(null, { rows: [
      { id: 'm' },
      { id: 'e' },
      { id: 'd' },
      { id: 'i' },
      { id: 'c' }
    ] }));
    return service().then(function() {
      chai.expect(allDocs.callCount).to.equal(1); // 1 'from' calls, 0 'to' calls
      chai.expect(Auth.callCount).to.equal(1);
      chai.expect(Auth.args[0][0]).to.equal('can_edit');
      chai.expect(from.callCount).to.equal(1);
      chai.expect(from.args[0][1].live).to.equal(true);
      chai.expect(from.args[0][1].retry).to.equal(true);
      chai.expect(from.args[0][1].doc_ids).to.deep.equal(['m','e','d','i','c']);
      chai.expect(to.callCount).to.equal(0);
    });
  });

  describe('replicateTo filter', function() {

    var filterFunction;

    before(function() {
      isAdmin.returns(false);
      to.returns(KarmaUtils.mockPromise());
      from.returns(KarmaUtils.mockPromise());
      Auth.returns(KarmaUtils.mockPromise());
      userCtx.returns({ name: 'mobile', roles: [ 'district-manager' ] });
      allDocs.returns(KarmaUtils.mockPromise(null, { rows: [] }));
      return service().then(function() {
        chai.expect(to.callCount).to.equal(1);
        filterFunction = to.args[0][1].filter;
      });
    });

    it('does not replicate the ddoc', function() {
      var actual = filterFunction({ _id: '_design/medic-client' });
      chai.expect(actual).to.equal(false);
    });

    it('does not replicate any ddoc - #3268', function() {
      var actual = filterFunction({ _id: '_design/sneaky-mcsneakface' });
      chai.expect(actual).to.equal(false);
    });

    it('does not replicate the resources doc', function() {
      var actual = filterFunction({ _id: 'resources' });
      chai.expect(actual).to.equal(false);
    });

    it('does not replicate the appcache doc', function() {
      var actual = filterFunction({ _id: 'appcache' });
      chai.expect(actual).to.equal(false);
    });

    it('does not replicate forms', function() {
      var actual = filterFunction({ _id: '1', type: 'form' });
      chai.expect(actual).to.equal(false);
    });

    it('does not replicate translations', function() {
      var actual = filterFunction({ _id: '1', type: 'translations' });
      chai.expect(actual).to.equal(false);
    });

    it('does replicate reports', function() {
      var actual = filterFunction({ _id: '1', type: 'data_record' });
      chai.expect(actual).to.equal(true);
    });
  });

});
