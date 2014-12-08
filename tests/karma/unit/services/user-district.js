describe('UserDistrict service', function() {

  'use strict';

  var service,
      userCtx,
      facility;

  beforeEach(function() {
    module('inboxApp');
    module(function ($provide) {
      $provide.value('UserCtxService', function() {
        return userCtx;
      });
      $provide.value('db', {
        getDoc: function(facilityId, callback) {
          callback(null, facility);
        }
      });
    });
    inject(function($injector) {
      service = $injector.get('UserDistrict');
    });
    userCtx = undefined;
    facility = undefined;
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
      roles: ['district_admin'],
      facility_id: 'x'
    };

    facility = {
      type: 'district_hospital'
    };

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
      chai.expect(err).to.equal('The administrator needs to give you additional privileges to use this site.');
      done();
    });

  });

  it('returns error for not logged in', function(done) {

    userCtx = {};

    service(function(err) {
      chai.expect(err).to.equal('Not logged in');
      done();
    });

  });

});