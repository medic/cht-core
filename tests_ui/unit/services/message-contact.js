describe('MessageContact service', function() {

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
      service = $injector.get('MessageContact');
    });
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

    service(null, function(err, actual) {
      chai.expect(actual.rows).to.deep.equal(expected.rows);
      done();
    });

    $httpBackend.flush();

  });

  it('builds district admin list', function(done) {

    var expected = {
      rows: [ 'a', 'b' ]
    };
    $httpBackend
      .when('GET', makeUrl('xyz'))
      .respond(expected);

    service('xyz', function(err, actual) {
      chai.expect(actual.rows).to.deep.equal(expected.rows);
      done();
    });

    $httpBackend.flush();

  });

});