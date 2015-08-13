describe('DeleteUser service', function() {

  'use strict';

  var service,
      $httpBackend,
      DeleteDoc,
      cacheRemove;

  beforeEach(function() {
    module('inboxApp');
    cacheRemove = sinon.stub();
    DeleteDoc = sinon.stub();
    module(function ($provide) {
      $provide.factory('DeleteDoc', function() {
        return DeleteDoc;
      });
    });
    inject(function($injector) {
      $httpBackend = $injector.get('$httpBackend');
      var $cacheFactory = $injector.get('$cacheFactory');
      $cacheFactory.get = function(name) {
        if (name !== '$http') {
          throw new Error('requesting the wrong cache');
        }
        return { remove: cacheRemove };
      };
      service = $injector.get('DeleteUser');
    });
  });

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
    KarmaUtils.restore(cacheRemove, DeleteDoc);
  });

  it('returns errors', function(done) {

    $httpBackend
      .expect('GET', '/_users/org.couchdb.user%3Agareth')
      .respond({ 
        _id: 'org.couchdb.user:gareth',
        name: 'gareth',
        starsign: 'aries'
      });
    $httpBackend
      .expect('PUT', '/_users/org.couchdb.user%3Agareth', {
        _id: 'org.couchdb.user:gareth',
        name: 'gareth',
        starsign: 'aries',
        _deleted: true
      })
      .respond(404, 'Not found');

    service({ id: 'org.couchdb.user:gareth', name: 'gareth' }, function(err) {
      chai.expect(err.message).to.equal('Not found');
      chai.expect(cacheRemove.callCount).to.equal(0);
      done();
    });

    $httpBackend.flush();
  });

  it('deletes the user and clears the cache', function(done) {

    $httpBackend
      .expect('GET', '/_users/org.couchdb.user%3Agareth')
      .respond({ 
        _id: 'org.couchdb.user:gareth',
        name: 'gareth',
        starsign: 'aries'
      });
    $httpBackend
      .expect('PUT', '/_users/org.couchdb.user%3Agareth', {
        _id: 'org.couchdb.user:gareth',
        name: 'gareth',
        starsign: 'aries',
        _deleted: true
      })
      .respond({ success: true });

    DeleteDoc.callsArgWith(1);

    service({
      id: 'org.couchdb.user:gareth',
      name: 'gareth'
    }, function(err) {
      chai.expect(err).to.equal(undefined);
      chai.expect(DeleteDoc.callCount).to.equal(1);
      chai.expect(DeleteDoc.firstCall.args[0]).to.equal('org.couchdb.user:gareth');
      chai.expect(cacheRemove.callCount).to.equal(3);
      chai.expect(cacheRemove.firstCall.args[0]).to.equal('/_users/org.couchdb.user%3Agareth');
      chai.expect(cacheRemove.secondCall.args[0]).to.equal('/_users/_all_docs?include_docs=true');
      chai.expect(cacheRemove.thirdCall.args[0]).to.equal('/_config/admins');
      done();
    });

    $httpBackend.flush();
  });

});