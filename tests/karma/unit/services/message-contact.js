describe('MessageContact service', function() {

  'use strict';

  var service,
      $httpBackend,
      district,
      districtErr,
      unallocated,
      settingsErr;

  beforeEach(function() {
    module('inboxApp');
    module(function ($provide) {
      $provide.value('BaseUrlService', function() {
        return 'BASEURL';
      });
      $provide.value('UserDistrict', function(callback) {
        callback(districtErr, district);
      });
      $provide.value('Settings', function(callback) {
        callback(settingsErr, { district_admins_access_unallocated_messages: unallocated });
      });
    });
    inject(function($injector) {
      $httpBackend = $injector.get('$httpBackend');
      service = $injector.get('MessageContact');
    });
    district = null;
    districtErr = null;
    unallocated = false;
    settingsErr = null;
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
      .expect('GET', makeUrl('admin'))
      .respond(expected);

    service({}, function(err, actual) {
      chai.expect(actual).to.deep.equal(expected.rows);
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
      .expect('GET', makeUrl('xyz'))
      .respond(expected);

    service({}, function(err, actual) {
      chai.expect(actual).to.deep.equal(expected.rows);
      done();
    });

    $httpBackend.flush();

  });

  it('requests unallocated for district admins', function(done) {

    unallocated = true;
    district = 'xyz';
    $httpBackend
      .expect('GET', makeUrl('xyz', 'abc'))
      .respond({ rows: [ 'a', 'b' ] });
    $httpBackend
      .expect('GET', makeUrl('none', 'abc'))
      .respond({ rows: [ 'c', 'd' ] });

    service({ districtAdmin: true }, function(err, actual) {
      chai.expect(actual).to.deep.equal([ 'a', 'b', 'c', 'd' ]);
      done();
    });

    $httpBackend.flush();

  });

  it('returns errors from user district', function(done) {
    districtErr = 'no connection';
    service({}, function(err) {
      chai.expect(err).to.equal('no connection');
      done();
    });
  });

  it('returns errors from db query', function(done) {

    $httpBackend
      .expect('GET', makeUrl('admin', 'abc'))
      .respond(503, 'server error');

    service({}, function(err) {
      chai.expect(err.message).to.equal('server error');
      done();
    });

    $httpBackend.flush();
  });

  it('returns errors from settings query', function(done) {

    settingsErr = 'gremlins! send for help!';
    district = 'xyz';
    $httpBackend
      .expect('GET', makeUrl('xyz', 'abc'))
      .respond({ rows: [ 'a', 'b' ] });

    service({ districtAdmin: true }, function(err) {
      chai.expect(err).to.equal('gremlins! send for help!');
      done();
    });

    $httpBackend.flush();
  });

});