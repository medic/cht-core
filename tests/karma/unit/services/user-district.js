describe('UserDistrict service', function() {

  'use strict';

  var service,
      user,
      userCtx,
      get,
      isAdmin;

  beforeEach(function() {
    get = sinon.stub();
    isAdmin = sinon.stub();
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
        isAdmin: isAdmin
      });
    });
    inject(function($injector) {
      service = $injector.get('UserDistrict');
    });
    userCtx = null;
    user = null;
  });

  afterEach(function() {
    KarmaUtils.restore(get, isAdmin);
  });

  it('returns nothing for db admin', function() {
    userCtx = {
      name: 'greg',
      roles: ['_admin']
    };
    isAdmin.returns(true);

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
    isAdmin.returns(true);

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
    isAdmin.returns(false);

    user = {
      name: 'jeff',
      roles: ['district_admin'],
      facility_id: 'x'
    };

    get.onCall(0).returns(KarmaUtils.mockPromise(null, user));
    get.onCall(1).returns(KarmaUtils.mockPromise(null, { type: 'district_hospital' }));

    return service()
      .then(function(actual) {
        chai.expect(actual).to.equal('x');
        chai.expect(get.callCount).to.equal(2);
        chai.expect(get.args[0][0]).to.equal('org.couchdb.user:jeff');
        chai.expect(get.args[1][0]).to.equal('x');
      });

  });

  it('returns error for non admin', function() {

    userCtx = {
      name: 'jeff',
      roles: ['analytics']
    };
    isAdmin.returns(false);

    return service()
      .then(function() {
        throw new Error('Expected error to be thrown');
      })
      .catch(function(err) {
        chai.expect(err.message).to.equal('The administrator needs to give you additional privileges to use this site.');
      });

  });

  it('returns error for not logged in', function() {

    userCtx = {};
    isAdmin.returns(false);

    return service()
      .then(function() {
        throw new Error('Expected error to be thrown');
      })
      .catch(function(err) {
        chai.expect(err.message).to.equal('Not logged in');
      });

  });

});