describe('UserDistrict service', function() {

  'use strict';

  var service,
      user,
      userCtx,
      get;

  beforeEach(function() {
    get = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ get: get }));
      $provide.value('User', function(callback) {
        callback(null, user);
      });
      $provide.value('UserCtxService', function() {
        return userCtx;
      });
    });
    inject(function($injector) {
      service = $injector.get('UserDistrict');
    });
    userCtx = null;
    user = null;
  });

  afterEach(function() {
    KarmaUtils.restore(get);
  });

  it('returns nothing for db admin', function(done) {
    userCtx = {
      name: 'greg',
      roles: ['_admin']
    };

    service(function(err, actual) {
      chai.expect(err).to.equal(undefined);
      chai.expect(actual).to.equal(undefined);
      done();
    });

  });

  it('returns nothing for national admin', function(done) {

    userCtx = {
      name: 'greg',
      roles: ['national_admin']
    };

    service(function(err, actual) {
      chai.expect(err).to.equal(undefined);
      chai.expect(actual).to.equal(undefined);
      done();
    });

  });

  it('returns district for district admin', function(done) {

    userCtx = {
      name: 'jeff',
      roles: ['district_admin']
    };

    user = {
      name: 'jeff',
      roles: ['district_admin'],
      facility_id: 'x'
    };

    get.onFirstCall().returns(KarmaUtils.mockPromise(null, { type: 'district_hospital' }));

    service(function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.equal('x');
      done();
    });

  });

  it('returns error for non admin', function(done) {

    userCtx = {
      name: 'jeff',
      roles: ['analytics']
    };

    service(function(err) {
      chai.expect(err.message).to.equal('The administrator needs to give you additional privileges to use this site.');
      done();
    });

  });

  it('returns error for not logged in', function(done) {

    userCtx = {};

    service(function(err) {
      chai.expect(err.message).to.equal('Not logged in');
      done();
    });

  });

});