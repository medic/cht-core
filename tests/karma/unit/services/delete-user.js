describe('DeleteUser service', function() {

  'use strict';

  var service,
      $httpBackend,
      DeleteDocs,
      get,
      cacheRemove;

  beforeEach(function() {
    module('inboxApp');
    cacheRemove = sinon.stub();
    DeleteDocs = sinon.stub();
    get = sinon.stub();
    module(function ($provide) {
      $provide.factory('DeleteDocs', function() {
        return DeleteDocs;
      });
      $provide.factory('DB', KarmaUtils.mockDB({ get: get }));
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
    KarmaUtils.restore(cacheRemove, DeleteDocs, get);
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

    service({ _id: 'org.couchdb.user:gareth', name: 'gareth' }, function(err) {
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

    get.returns(KarmaUtils.mockPromise(null, { _id: 'org.couchdb.user:gareth' }));
    DeleteDocs.returns(KarmaUtils.mockPromise());

    service({
      _id: 'org.couchdb.user:gareth',
      name: 'gareth'
    }, function(err) {
      chai.expect(err).to.equal(undefined);
      chai.expect(get.callCount).to.equal(1);
      chai.expect(get.args[0][0]).to.equal('org.couchdb.user:gareth');

      chai.expect(DeleteDocs.callCount).to.equal(1);
      chai.expect(DeleteDocs.args[0][0]._id).to.equal('org.couchdb.user:gareth');

      chai.expect(cacheRemove.callCount).to.equal(3);
      chai.expect(cacheRemove.args[0][0]).to.equal('/_users/org.couchdb.user%3Agareth');
      chai.expect(cacheRemove.args[1][0]).to.equal('/_users/_all_docs?include_docs=true');
      chai.expect(cacheRemove.args[2][0]).to.equal('/_config/admins');
      done();
    });

    $httpBackend.flush();
  });

});