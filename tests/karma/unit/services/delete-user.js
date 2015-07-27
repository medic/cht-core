describe('DeleteUser service', function() {

  'use strict';

  var service,
      $httpBackend,
      cacheRemove;

  beforeEach(function() {
    module('inboxApp');
    cacheRemove = sinon.stub();
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
    KarmaUtils.restore(cacheRemove);
  });

  it('returns errors', function(done) {

    $httpBackend
      .expect('GET', '/_users/org.couchdb.user:gareth')
      .respond({ 
        _id: 'org.couchdb.user:gareth',
        name: 'gareth',
        starsign: 'aries'
      });
    $httpBackend
      .expect('PUT', '/_users/org.couchdb.user:gareth', {
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
      .expect('GET', '/_users/org.couchdb.user:gareth')
      .respond({ 
        _id: 'org.couchdb.user:gareth',
        name: 'gareth',
        starsign: 'aries'
      });
    $httpBackend
      .expect('PUT', '/_users/org.couchdb.user:gareth', {
        _id: 'org.couchdb.user:gareth',
        name: 'gareth',
        starsign: 'aries',
        _deleted: true
      })
      .respond({ success: true });

    service({
      id: 'org.couchdb.user:gareth',
      name: 'gareth'
    }, function(err) {
      chai.expect(err).to.equal(undefined);
      chai.expect(cacheRemove.callCount).to.equal(3);
      chai.expect(cacheRemove.firstCall.args[0]).to.equal('/_users/org.couchdb.user%3Agareth');
      chai.expect(cacheRemove.secondCall.args[0]).to.equal('/_users/_all_docs?include_docs=true');
      chai.expect(cacheRemove.thirdCall.args[0]).to.equal('/_config/admins');
      done();
    });

    $httpBackend.flush();
  });

});