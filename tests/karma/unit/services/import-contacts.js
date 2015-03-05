describe('ImportContacts service', function() {

  'use strict';

  var service,
      $httpBackend,
      saveError,
      saveCount;

  beforeEach(function (){
    module('inboxApp');
    module(function ($provide) {
      $provide.value('SaveDoc', function(id, contact, callback) {
        saveCount++;
        callback(saveError);
      });
      $provide.value('BaseUrlService', function() {
        return 'BASEURL';
      });
    });
    inject(function($injector) {
      $httpBackend = $injector.get('$httpBackend');
      service = $injector.get('ImportContacts');
    });
    saveError = undefined;
    saveCount = 0;
  });

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  it('does nothing when there are no contacts', function(done) {
    service([], true, function(err) {
      chai.expect(err).to.equal(undefined);
      done();
    });
  });

  it('returns error when checking for existing contact errors', function(done) {
    $httpBackend
      .expect('HEAD', 'BASEURL/_db/1')
      .respond(503, 'boom');
    service([{ _id: 1 }], true, function(err) {
      chai.expect(err).to.equal('Error getting doc');
      done();
    });
    $httpBackend.flush();
  });

  it('returns error when saving contact errors', function(done) {
    $httpBackend
      .expect('HEAD', 'BASEURL/_db/1')
      .respond(404);
    saveError = 'boom';
    service([{ _id: 1 }], true, function(err) {
      chai.expect(err).to.equal('boom');
      done();
    });
    $httpBackend.flush();
  });

  it('creates new docs when none found', function(done) {
    $httpBackend
      .expect('HEAD', 'BASEURL/_db/1')
      .respond(404);
    $httpBackend
      .expect('HEAD', 'BASEURL/_db/2')
      .respond(404);
    service([{ _id: 1 }, { _id: 2 }], true, function(err) {
      chai.expect(err).to.equal(undefined);
      chai.expect(saveCount).to.equal(2);
      done();
    });
    $httpBackend.flush();
  });

  it('creates overwrites docs when flagged', function(done) {
    $httpBackend
      .expect('HEAD', 'BASEURL/_db/1')
      .respond(200, '', { ETag: 'abc' });
    $httpBackend
      .expect('HEAD', 'BASEURL/_db/2')
      .respond(200, '', { ETag: 'def' });
    service([{ _id: 1 }, { _id: 2 }], true, function(err) {
      chai.expect(err).to.equal(undefined);
      chai.expect(saveCount).to.equal(2);
      done();
    });
    $httpBackend.flush();
  });

  it('creates leaves docs unchanged when not flagged', function(done) {
    $httpBackend
      .expect('HEAD', 'BASEURL/_db/1')
      .respond(404);
    $httpBackend
      .expect('HEAD', 'BASEURL/_db/2')
      .respond(200, '', { ETag: 'def' });
    service([{ _id: 1 }, { _id: 2 }], false, function(err) {
      chai.expect(err).to.equal(undefined);
      chai.expect(saveCount).to.equal(1);
      done();
    });
    $httpBackend.flush();
  });

});
