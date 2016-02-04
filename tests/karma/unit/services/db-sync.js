describe('DBSync service', function() {

  'use strict';

  var service,
      to,
      from,
      getRemoteUrl,
      UserDistrict,
      Settings,
      userCtx,
      $rootScope,
      $q,
      changes,
      revsDiffInput,
      diff,
      localDb,
      remoteDb,
      changesStubLocal,
      revsDiffStubLocal,
      changesStubRemote,
      revsDiffStubRemote;

  beforeEach(function() {
    to = sinon.stub();
    from = sinon.stub();
    UserDistrict = sinon.stub();
    getRemoteUrl = sinon.stub();
    Settings = sinon.stub();
    userCtx = {};
    changes = {last_seq: 123, results: [
      {
        seq: 3,
        id: 'id1',
        changes: [{rev: 'revId1'}]
      },
      {
        seq: 4,
        id: 'id2',
        changes: [{rev: 'revId2'}]
      }
    ]};
    revsDiffInput = {
      'id1': ['revId1'],
      'id2': ['revId2']
    };
    diff = {
      'id1': {
        missing: ['revId1']
      },
      'id2': {
        missing: ['revId2']
      }
    };
    changesStubLocal = sinon.stub();
    revsDiffStubLocal = sinon.stub();
    changesStubRemote = sinon.stub();
    revsDiffStubRemote = sinon.stub();
    localDb = makeMockDb(to, from, changesStubLocal, changes, revsDiffStubLocal, diff);
    localDb.local = true;
    remoteDb = makeMockDb(to, from, changesStubRemote, changes, revsDiffStubRemote, diff);
    remoteDb.local = false;
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB(
        localDb,
        getRemoteUrl,
        remoteDb
      ));
      $provide.factory('UserDistrict', function() {
        return UserDistrict;
      });
      $provide.factory('Settings', function() {
        return Settings;
      });
      $provide.factory('Session', function() {
        return {
          userCtx: function() {
            return userCtx;
          }
        };
      });
    });
    inject(function(_DBSync_, _$rootScope_, _$q_) {
      service = _DBSync_;
      $rootScope = _$rootScope_;
      $q = _$q_;
    });
  });

  var makeMockDb = function(to, from, changesStub, changes, revsDiffStub, diff) {
    return {
      replicate: {
        to: to,
        from: from
      },
      info: function() { return KarmaUtils.mockPromise(null, {}); },
      changes: changesStub,
      revsDiff: revsDiffStub
    };
  };

  afterEach(function() {
    KarmaUtils.restore(to, from, getRemoteUrl, UserDistrict, Settings,
      changesStubLocal, changesStubRemote, revsDiffStubLocal, revsDiffStubRemote);
  });

  it('doesn\'t sync for admin', function(done) {
    userCtx = { roles: [ '_admin' ] };
    service.sync();
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
    Settings.returns(KarmaUtils.mockPromise(null, {}));
    service.sync();
    setTimeout(function() {
      $rootScope.$apply(); // needed to resolve the promises
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
  });

  it('requests unassigned docs if setting set and district admin', function(done) {
    userCtx = { roles: [ 'district_admin' ] };
    getRemoteUrl.returns('REMOTEDBURL');
    to.returns(KarmaUtils.mockPromise());
    from.returns(KarmaUtils.mockPromise());
    UserDistrict.callsArgWith(0, null, 'a');
    Settings.returns(KarmaUtils.mockPromise(null, { district_admins_access_unallocated_messages: true }));
    service.sync();
    setTimeout(function() {
      $rootScope.$apply(); // needed to resolve the promises
      chai.expect(from.args[0][1].query_params.unassigned).to.equal(true);
      done();
    });
  });

  it('does not request unassigned docs if setting set and not district admin', function(done) {
    userCtx = { };
    getRemoteUrl.returns('REMOTEDBURL');
    to.returns(KarmaUtils.mockPromise());
    from.returns(KarmaUtils.mockPromise());
    UserDistrict.callsArgWith(0, null, 'a');
    Settings.returns(KarmaUtils.mockPromise(null, { district_admins_access_unallocated_messages: true }));
    service.sync();
    setTimeout(function() {
      $rootScope.$apply(); // needed to resolve the promises
      chai.expect(from.args[0][1].query_params.unassigned).to.equal(undefined);
      done();
    });
  });

  it('returns online status = true when online', function(done) {
    userCtx = { };
    service.isOnline()
      .then(function (status) {
        chai.expect(status).to.equal(true);
        done();
      })
      .catch(done);
    setTimeout(function() {
      $rootScope.$apply();
    });
  });

  it('returns online status = false when offline', function(done) {
    userCtx = { };
    remoteDb.info = function() { return KarmaUtils.mockPromise('no info for you brew', {}); };
    service.isOnline()
      .then(function (status) {
        chai.expect(status).to.equal(false);
        done();
      })
      .catch(done);
    setTimeout(function() {
      $rootScope.$apply();
    });
  });

  it('does not return changes if user is admin', function(done) {
    userCtx = { roles: [ '_admin' ] };
    service.numChangesToSend().then(function() {
      done('should not return changes!');
    })
    .catch(function() {
      done();
    });
    setTimeout(function() {
      $rootScope.$apply();
    });
  });

  it('returns changes to fetch', function(done) {
    userCtx = { };

    // For getQueryParams
    Settings.returns(KarmaUtils.mockPromise(null, {}));
    UserDistrict.callsArgWith(0, null, 'a');

    changesStubRemote.returns(KarmaUtils.mockQPromise($q, null, changes));
    revsDiffStubLocal.returns(KarmaUtils.mockQPromise($q, null, diff));

    service.numChangesToFetch().then(function(numChanges) {
      chai.expect(numChanges).to.equal(2);
      var changesArgs = changesStubRemote.getCall(0).args[0];
      chai.expect(changesArgs.hasOwnProperty('filter')).to.equal(true);
      chai.expect(changesArgs.hasOwnProperty('query_params')).to.equal(true);
      chai.expect(revsDiffStubLocal.getCall(0).args[0]).to.deep.equal(revsDiffInput);
      done();
    })
    .catch(done);
    setTimeout(function() {
      $rootScope.$apply();
    });
  });

  it('returns changes to send', function(done) {
    userCtx = { };

    changesStubLocal.returns(KarmaUtils.mockQPromise($q, null, changes));
    revsDiffStubRemote.returns(KarmaUtils.mockQPromise($q, null, diff));

    service.numChangesToSend().then(function(numChanges) {
      chai.expect(numChanges).to.equal(2);
      var changesArgs = changesStubLocal.getCall(0).args[0];
      chai.expect(changesArgs.hasOwnProperty('filter')).to.equal(true);
      chai.expect(revsDiffStubRemote.getCall(0).args[0]).to.deep.equal(revsDiffInput);
      done();
    })
    .catch(done);
    setTimeout(function() {
      $rootScope.$apply();
    });
  });

  it('gets the initial lastSeq from checkpoint event, fetch', function(done) {
    userCtx = { };
    // For getQueryParams
    Settings.returns(KarmaUtils.mockPromise(null, {}));
    UserDistrict.callsArgWith(0, null, 'a');

    getRemoteUrl.returns('REMOTEDBURL');
    to.returns(KarmaUtils.mockPromise());

    // Capture the onCheckpoint callback for from repli.
    var fromPromise = KarmaUtils.mockQPromiseWithOnStub($q, null, {});
    from.returns(fromPromise);

    var lastSeqRemote = 1234;

    changesStubRemote.returns(KarmaUtils.mockQPromise($q, null, changes));
    revsDiffStubLocal.returns(KarmaUtils.mockQPromise($q, null, diff));

    service.sync();

    setTimeout(function() {
      $rootScope.$apply();
      // Call the onCheckpoint callback
      var checkpointCallback;
      var onStub = fromPromise.on;
      for (var i = 0; i < onStub.callCount; i ++) {
        var args = onStub.getCall(i).args;
        if (args[0] === 'checkpoint') {
          checkpointCallback = args[1];
        }
      }
      checkpointCallback(lastSeqRemote);

      service.numChangesToFetch().catch(done);
      setTimeout(function() {
        $rootScope.$apply();
        chai.expect(changesStubRemote.getCall(0).args[0].since).to.equal(lastSeqRemote);
        done();
      });
    });
  });

  it('gets the initial lastSeq from checkpoint event, send', function(done) {
    userCtx = { };
    // For getQueryParams
    Settings.returns(KarmaUtils.mockPromise(null, {}));
    UserDistrict.callsArgWith(0, null, 'a');

    getRemoteUrl.returns('REMOTEDBURL');
    from.returns(KarmaUtils.mockPromise());

    // Capture the onCheckpoint callback for from repli.
    var toPromise = KarmaUtils.mockQPromiseWithOnStub($q, null, {});
    to.returns(toPromise);

    var lastSeqLocal = 1234;

    changesStubLocal.returns(KarmaUtils.mockQPromise($q, null, changes));
    revsDiffStubRemote.returns(KarmaUtils.mockQPromise($q, null, diff));

    service.sync();

    setTimeout(function() {
      $rootScope.$apply();
      // Call the onCheckpoint callback
      var checkpointCallback;
      var onStub = toPromise.on;
      for (var i = 0; i < onStub.callCount; i ++) {
        var args = onStub.getCall(i).args;
        if (args[0] === 'checkpoint') {
          checkpointCallback = args[1];
        }
      }
      checkpointCallback(lastSeqLocal);

      service.numChangesToSend().catch(done);
      setTimeout(function() {
        $rootScope.$apply();
        chai.expect(changesStubLocal.getCall(0).args[0].since).to.equal(lastSeqLocal);
        done();
      });
    });
  });
});
