describe('MessageContact service', function() {

  'use strict';

  var service,
      $httpBackend,
      district,
      districtErr;

  beforeEach(function() {
    module('inboxApp');
    module(function ($provide) {
      $provide.value('BaseUrlService', function() {
        return 'BASEURL';
      });
      $provide.value('UserDistrict', function(callback) {
        callback(districtErr, district);
      });
    });
    inject(function($injector) {
      $httpBackend = $injector.get('$httpBackend');
      service = $injector.get('MessageContact');
    });
    district = null;
    districtErr = null;
  });

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  var makeUrl = function(districtId) {
    return encodeURI(
      'BASEURL/message_contacts?' +
      'endkey=["' + districtId + '",{}]&' +
      'group_level=2&' +
      'startkey=["' + districtId + '"]'
    );
  };

  it('builds admin list', function(done) {

    var expected = {
      rows: [ 'a', 'b' ]
    };
    $httpBackend
      .when('GET', makeUrl('admin'))
      .respond(expected);

    service(function(err, actual) {
      chai.expect(actual.rows).to.deep.equal(expected.rows);
      done();
    });

    $httpBackend.flush();

  });

  it('builds district admin list', function(done) {

    var expected = {
      rows: [ 'a', 'b' ]
    };
    district = 'xyz';
    $httpBackend
      .when('GET', makeUrl('xyz'))
      .respond(expected);

    service(function(err, actual) {
      chai.expect(actual.rows).to.deep.equal(expected.rows);
      done();
    });

    $httpBackend.flush();

  });

  it('returns errors from user district', function(done) {
    districtErr = 'no connection';
    service(function(err) {
      chai.expect(err).to.equal('no connection');
      done();
    });
  });

  it('returns errors from db query', function(done) {

    $httpBackend
      .when('GET', makeUrl('admin'))
      .respond(503, 'server error');

    service(function(err) {
      chai.expect(err.data).to.equal('server error');
      done();
    });

    $httpBackend.flush();
  });

});