describe('UpdateSettings service', function() {

  'use strict';

  var service,
      $httpBackend;

  beforeEach(function() {
    module('inboxApp');
    module(function ($provide) {
      $provide.value('Location', { path: 'BASEURL' });
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

  it('updates settings', function() {
    var updates = {
      isTrue: true,
      isString: 'hello'
    };
    $httpBackend
      .expect('PUT', 'BASEURL/update_settings/medic', JSON.stringify(updates))
      .respond({ success: true });
    setTimeout($httpBackend.flush);
    return service(updates);
  });

  it('replaces settings', function() {
    var updates = {
      isTrue: true,
      isString: 'hello'
    };
    $httpBackend
      .expect('PUT', 'BASEURL/update_settings/medic?replace=true', JSON.stringify(updates))
      .respond({ success: true });
    setTimeout($httpBackend.flush);
    return service(updates, { replace: true });
  });

  it('returns errors', function(done) {
    var updates = {
      isTrue: true,
      isString: 'hello'
    };
    $httpBackend
      .expect('PUT', 'BASEURL/update_settings/medic', JSON.stringify(updates))
      .respond(404, 'Not found');
    service(updates)
      .then(function() {
        done(new Error('expected error'));
      })
      .catch(function(err) {
        chai.expect(err.data).to.equal('Not found');
        done();
      });
    $httpBackend.flush();
  });

});

