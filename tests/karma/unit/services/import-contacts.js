describe('ImportContacts service', function() {

  'use strict';

  var service,
      SaveDoc,
      $httpBackend;

  beforeEach(function() {
    SaveDoc = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('SaveDoc', function() {
        return SaveDoc;
      });
      $provide.value('BaseUrlService', function() {
        return 'BASEURL';
      });
    });
    inject(function($injector) {
      $httpBackend = $injector.get('$httpBackend');
      service = $injector.get('ImportContacts');
    });
  });

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
    if (SaveDoc.restore) {
      SaveDoc.restore();
    }
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
    SaveDoc.callsArgWith(2, 'boom');
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
    SaveDoc.callsArgWith(2, null, {});
    var contact1 = { _id: 1 };
    var contact2 = { _id: 2 };
    service([contact1, contact2], true, function(err) {
      chai.expect(err).to.equal(undefined);
      chai.expect(SaveDoc.calledTwice).to.equal(true);
      chai.expect(SaveDoc.args[0][0]).to.equal(null);
      chai.expect(SaveDoc.args[0][1]).to.deep.equal(contact1);
      chai.expect(SaveDoc.args[1][0]).to.equal(null);
      chai.expect(SaveDoc.args[1][1]).to.deep.equal(contact2);
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
    SaveDoc.callsArgWith(2, null, {});
    service([{ _id: 1 }, { _id: 2 }], true, function(err) {
      chai.expect(err).to.equal(undefined);
      chai.expect(SaveDoc.calledTwice).to.equal(true);
      chai.expect(SaveDoc.args[0][0]).to.equal(1);
      chai.expect(SaveDoc.args[0][1]).to.deep.equal({ _id: 1, _rev: 'abc' });
      chai.expect(SaveDoc.args[1][0]).to.equal(2);
      chai.expect(SaveDoc.args[1][1]).to.deep.equal({ _id: 2, _rev: 'def' });
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
    SaveDoc.callsArgWith(2, null, {});
    service([{ _id: 1 }, { _id: 2 }], false, function(err) {
      chai.expect(err).to.equal(undefined);
      chai.expect(SaveDoc.calledOnce).to.equal(true);
      chai.expect(SaveDoc.args[0][0]).to.equal(null);
      chai.expect(SaveDoc.args[0][1]).to.deep.equal({ _id: 1 });
      done();
    });
    $httpBackend.flush();
  });

});
