describe('UserDistrict service', function() {

  'use strict';

  var service,
      user,
      userCtx,
      get,
      isOnlineOnly;

  beforeEach(function() {
    get = sinon.stub();
    isOnlineOnly = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ get: get }));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('UserSettings', function(callback) {
        callback(null, user);
      });
      $provide.value('Session', {
        userCtx: function() {
          return userCtx;
        },
        isOnlineOnly: isOnlineOnly
      });
    });
    inject(function($injector) {
      service = $injector.get('UserDistrict');
    });
    userCtx = null;
    user = null;
  });

  afterEach(function() {
    KarmaUtils.restore(get, isOnlineOnly);
  });

  it('returns nothing for db admin', function() {
    userCtx = {
      name: 'greg',
      roles: ['_admin']
    };
    isOnlineOnly.returns(true);

    return service()
      .then(function(actual) {
        chai.expect(actual).to.equal(undefined);
      });

  });

  it('returns nothing for national admin', function() {

    userCtx = {
      name: 'greg',
      roles: ['national_admin']
    };
    isOnlineOnly.returns(true);

    return service()
      .then(function(actual) {
        chai.expect(actual).to.equal(undefined);
      });

  });

  it('returns district for district admin', function() {

    userCtx = {
      name: 'jeff',
      roles: ['district_admin']
    };
    isOnlineOnly.returns(false);

    user = {
      name: 'jeff',
      roles: ['district_admin'],
      facility_id: 'x'
    };

    get.onCall(0).returns(Promise.resolve(user));
    get.onCall(1).returns(Promise.resolve({ type: 'district_hospital' }));

    return service()
      .then(function(actual) {
        chai.expect(actual).to.equal('x');
        chai.expect(get.callCount).to.equal(2);
        chai.expect(get.args[0][0]).to.equal('org.couchdb.user:jeff');
        chai.expect(get.args[1][0]).to.equal('x');
      });

  });

  it('returns error for district admin without a facility_id', function() {

    userCtx = {
      name: 'jeff',
      roles: ['district_admin']
    };
    isOnlineOnly.returns(false);

    user = {
      name: 'jeff',
      roles: ['district_admin']
    };

    get.onCall(0).returns(Promise.resolve(user));

    return service()
      .then(function() {
        throw new Error('Expected error to be thrown');
      })
      .catch(function(err) {
        chai.expect(err.message).to.equal('No district assigned to district admin.');
      });

  });

  it('returns error for district admin with a facility_id that doesn\'t exist', function() {

    userCtx = {
      name: 'jeff',
      roles: ['district_admin']
    };
    isOnlineOnly.returns(false);

    user = {
      name: 'jeff',
      roles: ['district_admin'],
      facility_id: 'x'
    };

    var err404 = {status: 404, name: 'not_found', message: 'missing', error: true, reason: 'missing'};

    get.onCall(0).returns(Promise.resolve(user));
    get.onCall(1).returns(Promise.reject(err404));
    get.onCall(2).returns(Promise.reject(err404));

    return service()
      .then(function() {
        throw new Error('Expected error to be thrown');
      })
      .catch(function(err) {
        chai.expect(err.status).to.equal(404);
      });

  });

  it('returns error for not logged in', function() {

    userCtx = {};

    return service()
      .then(function() {
        throw new Error('Expected error to be thrown');
      })
      .catch(function(err) {
        chai.expect(err.message).to.equal('Not logged in');
      });

  });

});
