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
      chai.expect(err.message).to.equal('boom');
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

  it('overwrites docs when flagged', function(done) {
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

  it('leaves docs unchanged when not flagged', function(done) {
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

  it('creates person docs when required', function(done) {
    $httpBackend
      .expect('HEAD', 'BASEURL/_db/1')
      .respond(404);
    $httpBackend
      .expect('HEAD', 'BASEURL/_db/2')
      .respond(404);
    SaveDoc.onCall(0).callsArgWith(2, null, { _id: 1, _rev: 1 });
    SaveDoc.onCall(1).callsArgWith(2, null, { _id: 4, _rev: 1 });
    SaveDoc.onCall(2).callsArgWith(2, null, {});
    SaveDoc.onCall(3).callsArgWith(2, null, {});
    var contact1 = { _id: 1, contact: { name: 'john', phone: '+123' } };
    var contact2 = { _id: 2, contact: { _id: 3, name: 'jack', phone: '+123' } };
    service([contact1, contact2], true, function(err) {
      chai.expect(err).to.equal(undefined);
      chai.expect(SaveDoc.callCount).to.equal(4);

      // save first place
      chai.expect(SaveDoc.args[0][0]).to.equal(null);
      chai.expect(SaveDoc.args[0][1]._id).to.equal(1);
      chai.expect(SaveDoc.args[0][1].contact.name).to.equal('john');
      chai.expect(SaveDoc.args[0][1].contact.phone).to.equal('+123');

      // save contact
      chai.expect(SaveDoc.args[1][0]).to.equal(null);
      chai.expect(SaveDoc.args[1][1].type).to.equal('person');
      chai.expect(SaveDoc.args[1][1].name).to.equal('john');
      chai.expect(SaveDoc.args[1][1].phone).to.equal('+123');
      chai.expect(SaveDoc.args[1][1].parent._id).to.equal(1);

      // updated place with contact
      chai.expect(SaveDoc.args[2][0]).to.equal(1);
      chai.expect(SaveDoc.args[2][1].contact.type).to.equal('person');
      chai.expect(SaveDoc.args[2][1].contact.name).to.equal('john');
      chai.expect(SaveDoc.args[2][1].contact.phone).to.equal('+123');
      chai.expect(SaveDoc.args[2][1].contact._id).to.equal(4);
      chai.expect(SaveDoc.args[2][1].contact._rev).to.equal(1);

      // save second place
      chai.expect(SaveDoc.args[3][0]).to.equal(null);
      chai.expect(SaveDoc.args[3][1]).to.deep.equal(contact2);

      done();
    });
    $httpBackend.flush();
  });

});
