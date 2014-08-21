describe('MessageContacts service', function() {

  'use strict';

  var service,
      user,
      settings,
      $httpBackend,
      rows;

  beforeEach(function() {
    user = {};
    settings = {};
    module('inboxApp');
    module(function ($provide) {
      $provide.value('BaseUrlService', function() {
        return 'BASEURL';
      });
    });
    inject(function($injector) {
      $httpBackend = $injector.get('$httpBackend');
      service = $injector.get('MessageContacts');
    });
  });

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  var makeListUrl = function(districtId) {
    return 'BASEURL/message_contacts?endkey=%5B%22' +
      districtId + '%22,%7B%7D%5D&group=true&startkey=%5B%22' +
      districtId + '%22%5D';
  };

  var makeContentUrl = function(districtId, contactId) {
    return 'BASEURL/message_contacts?include_docs=true&key=%5B%22' +
      districtId + '%22,%22' + contactId + '%22%5D&reduce=false';
  };

  it('builds admin list', function(done) {

    rows = [ 'a', 'b' ];
    $httpBackend
      .when('GET', makeListUrl('admin'))
      .respond({ rows: rows });

    service(null, null, function(err, actual) {
      chai.expect(actual).to.deep.equal(rows);
      done();
    });

    $httpBackend.flush();

  });

  it('builds district admin list', function(done) {

    rows = [ 'a', 'b' ];
    $httpBackend
      .when('GET', makeListUrl('xyz'))
      .respond({ rows: rows });

    service('xyz', null, function(err, actual) {
      chai.expect(actual).to.deep.equal(rows);
      done();
    });

    $httpBackend.flush();

  });

  it('builds admin content', function(done) {

    rows = [ 'a', 'b' ];
    $httpBackend
      .when('GET', makeContentUrl('admin', 'abc'))
      .respond({ rows: rows });

    service(null, 'abc', function(err, actual) {
      chai.expect(actual).to.deep.equal(rows);
      done();
    });

    $httpBackend.flush();

  });

  it('builds district admin content', function(done) {

    rows = [ 'a', 'b' ];
    $httpBackend
      .when('GET', makeContentUrl('xyz', 'abc'))
      .respond({ rows: rows });

    service('xyz', 'abc', function(err, actual) {
      chai.expect(actual).to.deep.equal(rows);
      done();
    });

    $httpBackend.flush();

  });
});