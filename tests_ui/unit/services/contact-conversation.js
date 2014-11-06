describe('ContactConversation service', function() {

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
      service = $injector.get('ContactConversation');
    });
    district = null;
    districtErr = null;
  });

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  var makeUrl = function(districtId, contactId, skip) {
    return encodeURI(
      'BASEURL/message_contacts?' +
      'descending=true&' +
      'endkey=["' + districtId + '","' + contactId + '"]&' +
      'include_docs=true&' +
      'limit=50&' +
      'reduce=false&' +
      (skip ? 'skip=' + skip + '&' : '') +
      'startkey=["' + districtId + '","' + contactId + '",{}]'
    );
  };

  it('builds admin conversation', function(done) {

    var expected = {
      rows: [ 'a', 'b' ]
    };
    $httpBackend
      .when('GET', makeUrl('admin', 'abc'))
      .respond(expected);

    service({ id: 'abc'}, function(err, actual) {
      chai.expect(actual.rows).to.deep.equal(expected.rows);
      done();
    });

    $httpBackend.flush();

  });

  it('builds district admin conversation', function(done) {

    var expected = {
      rows: [ 'a', 'b' ]
    };
    district = 'xyz';
    $httpBackend
      .when('GET', makeUrl('xyz', 'abc'))
      .respond(expected);

    service({ id: 'abc' }, function(err, actual) {
      chai.expect(actual.rows).to.deep.equal(expected.rows);
      done();
    });

    $httpBackend.flush();

  });

  it('builds admin conversation with skip', function(done) {

    var expected = {
      rows: [ 'a', 'b' ]
    };
    $httpBackend
      .when('GET', makeUrl('admin', 'abc', 45))
      .respond(expected);

    service({ id: 'abc', skip: 45 }, function(err, actual) {
      chai.expect(actual.rows).to.deep.equal(expected.rows);
      done();
    });

    $httpBackend.flush();

  });

  it('returns errors from user district', function(done) {
    districtErr = 'no connection';
    service({ id: 'abc' }, function(err) {
      chai.expect(err).to.equal('no connection');
      done();
    });
  });

  it('returns errors from db query', function(done) {

    $httpBackend
      .when('GET', makeUrl('admin', 'abc'))
      .respond(503, 'server error');

    service({ id: 'abc' }, function(err) {
      chai.expect(err.data).to.equal('server error');
      done();
    });

    $httpBackend.flush();
  });

});