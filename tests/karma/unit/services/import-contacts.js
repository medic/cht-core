describe('ImportContacts service', function() {

  'use strict';

  var service,
      put,
      $httpBackend;

  beforeEach(function() {
    put = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ put: put }));
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
    KarmaUtils.restore(put);
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
    put.returns(KarmaUtils.fakeResolved('boom'));
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
    put
      .onFirstCall().returns(KarmaUtils.fakeResolved(null, { _id: 1, _rev: 1 }))
      .onSecondCall().returns(KarmaUtils.fakeResolved(null, { _id: 2, _rev: 1 }));
    var contact1 = { _id: 1 };
    var contact2 = { _id: 2 };
    service([contact1, contact2], true, function(err) {
      chai.expect(err).to.equal(undefined);
      chai.expect(put.calledTwice).to.equal(true);
      chai.expect(put.args[0][0]).to.deep.equal(contact1);
      chai.expect(put.args[1][0]).to.deep.equal(contact2);
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
    put
      .onFirstCall().returns(KarmaUtils.fakeResolved(null, { _id: 1, _rev: 1 }))
      .onSecondCall().returns(KarmaUtils.fakeResolved(null, { _id: 2, _rev: 1 }));
    service([{ _id: 1 }, { _id: 2 }], true, function(err) {
      chai.expect(err).to.equal(undefined);
      chai.expect(put.calledTwice).to.equal(true);
      chai.expect(put.args[0][0]._id).to.equal(1);
      chai.expect(put.args[1][0]._id).to.equal(2);
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
    put
      .onFirstCall().returns(KarmaUtils.fakeResolved(null, { _id: 1, _rev: 1 }))
      .onSecondCall().returns(KarmaUtils.fakeResolved(null, { _id: 2, _rev: 1 }));
    service([{ _id: 1 }, { _id: 2 }], false, function(err) {
      chai.expect(err).to.equal(undefined);
      chai.expect(put.calledOnce).to.equal(true);
      chai.expect(put.args[0][0]).to.deep.equal({ _id: 1, _rev: 1 });
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
    put.onCall(0).returns(KarmaUtils.fakeResolved(null, { _id: 1, _rev: 1 }));
    put.onCall(1).returns(KarmaUtils.fakeResolved(null, { _id: 4, _rev: 1 }));
    put.onCall(2).returns(KarmaUtils.fakeResolved(null, { }));
    put.onCall(3).returns(KarmaUtils.fakeResolved(null, { }));
    var contact1 = { _id: 1, contact: { name: 'john', phone: '+123' } };
    var contact2 = { _id: 2, contact: { _id: 3, name: 'jack', phone: '+123' } };
    service([contact1, contact2], true, function(err) {
      chai.expect(err).to.equal(undefined);
      chai.expect(put.callCount).to.equal(4);

      // save first place
      chai.expect(put.args[0][0]._id).to.equal(1);
      chai.expect(put.args[0][0].contact.name).to.equal('john');
      chai.expect(put.args[0][0].contact.phone).to.equal('+123');

      // save contact
      chai.expect(put.args[1][0].type).to.equal('person');
      chai.expect(put.args[1][0].name).to.equal('john');
      chai.expect(put.args[1][0].phone).to.equal('+123');
      chai.expect(put.args[1][0].parent._id).to.equal(1);

      // updated place with contact
      chai.expect(put.args[2][0].contact.type).to.equal('person');
      chai.expect(put.args[2][0].contact.name).to.equal('john');
      chai.expect(put.args[2][0].contact.phone).to.equal('+123');
      chai.expect(put.args[2][0].contact._id).to.equal(4);
      chai.expect(put.args[2][0].contact._rev).to.equal(1);

      // save second place
      chai.expect(put.args[3][0]).to.deep.equal(contact2);

      done();
    });
    $httpBackend.flush();
  });

});
