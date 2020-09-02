describe('UpdateSettings service', function() {

  'use strict';

  let service;
  let $httpBackend;

  beforeEach(function() {
    module('adminApp');
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
    const updates = {
      isTrue: true,
      isString: 'hello'
    };
    $httpBackend
      .expect('PUT', '/api/v1/settings', JSON.stringify(updates))
      .respond({ success: true });
    setTimeout($httpBackend.flush);
    return service(updates);
  });

  it('replaces settings', function() {
    const updates = {
      isTrue: true,
      isString: 'hello'
    };
    $httpBackend
      .expect('PUT', '/api/v1/settings?replace=true', JSON.stringify(updates))
      .respond({ success: true });
    setTimeout($httpBackend.flush);
    return service(updates, { replace: true });
  });

  it('returns errors', function(done) {
    const updates = {
      isTrue: true,
      isString: 'hello'
    };
    $httpBackend
      .expect('PUT', '/api/v1/settings', JSON.stringify(updates))
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

