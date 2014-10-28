describe('ContactConversation service', function() {

  'use strict';

  var service,
      $httpBackend;

  beforeEach(function() {
    module('inboxApp');
    module(function ($provide) {
      $provide.value('BaseUrlService', function() {
        return 'BASEURL';
      });
    });
    inject(function($injector) {
      $httpBackend = $injector.get('$httpBackend');
      service = $injector.get('ContactConversation');
    });
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

    service(null, 'abc', null, function(err, actual) {
      chai.expect(actual.rows).to.deep.equal(expected.rows);
      done();
    });

    $httpBackend.flush();

  });

  it('builds district admin conversation', function(done) {

    var expected = {
      rows: [ 'a', 'b' ]
    };
    $httpBackend
      .when('GET', makeUrl('xyz', 'abc'))
      .respond(expected);

    service('xyz', 'abc', null, function(err, actual) {
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

    service(null, 'abc', 45, function(err, actual) {
      chai.expect(actual.rows).to.deep.equal(expected.rows);
      done();
    });

    $httpBackend.flush();

  });

});