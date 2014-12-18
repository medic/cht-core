describe('UpdateSettings service', function() {

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
      service = $injector.get('UpdateSettings');
    });
  });

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  it('updates settings', function(done) {

    var updates = {
      isTrue: true,
      isString: 'hello'
    };
    $httpBackend
      .expect('PUT', 'BASEURL/update_settings/medic', JSON.stringify(updates))
      .respond({ success: true });

    service(updates, function(err) {
      chai.expect(err).to.equal(undefined);
      done();
    });

    $httpBackend.flush();

  });

  it('returns errors', function(done) {

    var updates = {
      isTrue: true,
      isString: 'hello'
    };
    $httpBackend
      .expect('PUT', 'BASEURL/update_settings/medic', JSON.stringify(updates))
      .respond(404, '');

    service(updates, function(err) {
      chai.expect(err).to.not.equal(null);
      chai.expect(err.status).to.equal(404);
      done();
    });

    $httpBackend.flush();

  });

});

