describe('DBSync service', () => {

  'use strict';

  let service,
      to,
      from,
      query,
      allDocs,
      info,
      isOnlineOnly,
      userCtx,
      sync,
      Auth,
      recursiveOn;

  beforeEach(() => {
    recursiveOn = sinon.stub();
    recursiveOn.returns({ on: recursiveOn });
    to = sinon.stub();
    to.returns({ on: recursiveOn });
    from = sinon.stub();
    from.returns({ on: recursiveOn });
    query = sinon.stub();
    allDocs = sinon.stub();
    info = sinon.stub();
    info.returns(Q.resolve({update_seq: -99}));
    isOnlineOnly = sinon.stub();
    userCtx = sinon.stub();
    sync = sinon.stub();
    Auth = sinon.stub();

    module('inboxApp');
    module($provide => {
      $provide.factory('DB', KarmaUtils.mockDB({
        replicate: { to: to, from: from },
        allDocs: allDocs,
        sync: sync,
        info: info
      }));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('Session', {
        isOnlineOnly: isOnlineOnly,
        userCtx: userCtx
      } );
      $provide.value('Auth', Auth);
    });
    inject(_DBSync_ => {
      service = _DBSync_;
    });
  });

  afterEach(() => {
    KarmaUtils.restore(to, from, query, allDocs, info, isOnlineOnly, userCtx, sync, Auth);
  });

  it('does nothing for admin', () => {
    isOnlineOnly.returns(true);
    return service(() => { }).then(() => {
      chai.expect(to.callCount).to.equal(0);
      chai.expect(from.callCount).to.equal(0);
    });
  });

  it('initiates sync for non-admin', () => {
    isOnlineOnly.returns(false);
    Auth.returns(Promise.resolve());
    userCtx.returns({ name: 'mobile', roles: [ 'district-manager' ] });
    allDocs.returns(Promise.resolve({ rows: [
      { id: 'm' },
      { id: 'e' },
      { id: 'd' },
      { id: 'i' },
      { id: 'c' }
    ] }));
    return service().then(() => {
      chai.expect(allDocs.callCount).to.equal(0);
      chai.expect(Auth.callCount).to.equal(1);
      chai.expect(Auth.args[0][0]).to.equal('can_edit');
      chai.expect(from.callCount).to.equal(1);
      chai.expect(from.withArgs(sinon.match.any, sinon.match({ live: true, retry: true })).callCount).to.equal(1);
      chai.expect(from.args[0][1]).to.not.have.keys('doc_ids', 'checkpoint');
      chai.expect(to.callCount).to.equal(1);
      chai.expect(to.args[0][1].live).to.equal(true);
      chai.expect(to.args[0][1].retry).to.equal(true);
      chai.expect(to.args[0][1].checkpoint).to.equal('source');
      const backoff = to.args[0][1].back_off_function;
      chai.expect(backoff(0)).to.equal(1000);
      chai.expect(backoff(2000)).to.equal(4000);
      chai.expect(backoff(31000)).to.equal(60000);
    });
  });

  it('does not sync to remote if user lacks "can_edit" permission', () => {
    isOnlineOnly.returns(false);
    Auth.returns(Promise.reject('unauthorized'));
    userCtx.returns({ name: 'mobile', roles: [ 'district-manager' ] });
    allDocs.returns(Promise.resolve({ rows: [
      { id: 'm' },
      { id: 'e' },
      { id: 'd' },
      { id: 'i' },
      { id: 'c' }
    ] }));
    return service().then(() => {
      chai.expect(allDocs.callCount).to.equal(0);
      chai.expect(Auth.callCount).to.equal(1);
      chai.expect(Auth.args[0][0]).to.equal('can_edit');
      chai.expect(from.callCount).to.equal(1);
      chai.expect(from.withArgs(sinon.match.any, sinon.match({ live: true, retry: true })).callCount).to.equal(1);
      chai.expect(from.args[0][1]).to.not.have.keys('doc_ids', 'checkpoint');
      chai.expect(to.callCount).to.equal(0);
    });
  });

  describe('replicateTo filter', () => {

    let filterFunction;

    before(() => {
      isOnlineOnly.returns(false);
      Auth.returns(Promise.resolve());
      userCtx.returns({ name: 'mobile', roles: [ 'district-manager' ] });
      allDocs.returns(Promise.resolve({ rows: [] }));
      info.returns(Q.resolve({update_seq: -99}));
      to.returns({ on: recursiveOn });
      from.returns({ on: recursiveOn });
      return service().then(() => {
        chai.expect(to.callCount).to.equal(1);
        filterFunction = to.args[0][1].filter;
      });
    });

    it('does not replicate the ddoc', () => {
      const actual = filterFunction({ _id: '_design/medic-client' });
      chai.expect(actual).to.equal(false);
    });

    it('does not replicate any ddoc - #3268', () => {
      const actual = filterFunction({ _id: '_design/sneaky-mcsneakface' });
      chai.expect(actual).to.equal(false);
    });

    it('does not replicate the resources doc', () => {
      const actual = filterFunction({ _id: 'resources' });
      chai.expect(actual).to.equal(false);
    });

    it('does not replicate the appcache doc', () => {
      const actual = filterFunction({ _id: 'appcache' });
      chai.expect(actual).to.equal(false);
    });

    it('does not replicate forms', () => {
      const actual = filterFunction({ _id: '1', type: 'form' });
      chai.expect(actual).to.equal(false);
    });

    it('does not replicate translations', () => {
      const actual = filterFunction({ _id: '1', type: 'translations' });
      chai.expect(actual).to.equal(false);
    });

    it('does replicate reports', () => {
      const actual = filterFunction({ _id: '1', type: 'data_record' });
      chai.expect(actual).to.equal(true);
    });
  });

});
